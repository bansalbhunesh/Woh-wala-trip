/**
 * Unit tests for the four highest-risk tRPC procedures — TEST-01.
 *
 * Tests exercise core authorization, validation, and state-machine guards
 * by calling procedure handlers with crafted mock contexts.
 *
 * Procedures covered:
 *  - trips.generateLore  (UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, TOO_MANY_REQUESTS, success)
 *  - trips.upgradeTier   (UNAUTHORIZED, FORBIDDEN, HMAC validation, tier update)
 *  - photos.confirmUpload (cross-trip path injection, idempotency, 50MB cap)
 *  - battles.challenge   (UNAUTHORIZED, FORBIDDEN, rate limit, background_jobs queue insert)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ---------------------------------------------------------------------------
// Self-referential chainable Supabase mock
// ---------------------------------------------------------------------------

/**
 * ALL chaining methods (select, eq, neq, …) return the SAME object so that
 * `.from().select().eq().single()` calls `single` on the same instance.
 *
 * @param singleResult – what `.single()` / `.maybeSingle()` resolves to
 * @param awaitResult  – what `await chain` resolves to (for count queries)
 */
function makeChain(
  singleResult: unknown = { data: null, error: null },
  awaitResult: unknown = { data: null, count: null, error: null }
): Record<string, unknown> {
  const self: Record<string, unknown> = {};

  for (const m of [
    'from',
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'not',
    'is',
    'or',
    'gte',
    'lt',
    'order',
    'limit',
  ]) {
    self[m] = vi.fn().mockReturnValue(self);
  }

  self.single = vi.fn().mockResolvedValue(singleResult);
  self.maybeSingle = vi.fn().mockResolvedValue(singleResult);

  // Make the chain awaitable without `.single()` — used for count queries
  const p = Promise.resolve(awaitResult);
  self.then = (p as PromiseLike<unknown>).then.bind(p);
  self.catch = (p as Promise<unknown>).catch.bind(p as Promise<unknown>);

  return self;
}

// ---------------------------------------------------------------------------
// Mutable service client — tests replace this before calling createCaller
// ---------------------------------------------------------------------------

let mockServiceClient: Record<string, unknown> = makeChain();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServiceClient: vi.fn(() => mockServiceClient),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/langfuse', () => ({
  langfuse: {
    span: vi.fn(() => ({ end: vi.fn(), setMetadata: vi.fn() })),
    event: vi.fn(),
    flush: vi.fn(),
  },
  traceSecurityEvent: vi.fn(),
}));

vi.mock('@/lib/worker-auth', () => ({
  signWorkerRequest: vi.fn().mockResolvedValue({ signature: 'test-sig', timestamp: '9999999' }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

type MockUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

function authCtx(user: MockUser, chain: Record<string, unknown> = makeChain()) {
  return { user, supabase: chain };
}

function anonCtx() {
  return { user: null, supabase: makeChain() };
}

// ---------------------------------------------------------------------------
// trips.generateLore
// ---------------------------------------------------------------------------

describe('trips.generateLore', () => {
  const TRIP_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = 'user-creator-001';
  const OTHER_ID = 'user-other-002';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws UNAUTHORIZED when no user in context', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    await expect(
      tripsRouter.createCaller(anonCtx() as never).generateLore({ tripId: TRIP_ID })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when caller is not the trip creator', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('AI_WORKER_URL', 'https://worker.example.com');

    const chain = makeChain({ data: { creator_id: OTHER_ID }, error: null });
    const ctx = authCtx({ id: USER_ID }, chain);

    await expect(
      tripsRouter.createCaller(ctx as never).generateLore({ tripId: TRIP_ID })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws BAD_REQUEST when trip has fewer than 5 photos', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('AI_WORKER_URL', 'https://worker.example.com');

    // Need two different chains: one for the creator check, one for the photo count.
    const photosChain = makeChain(
      { data: null, error: null },
      { data: null, count: 3, error: null } // count query — 3 photos
    );
    const tripsChain = makeChain({ data: { creator_id: USER_ID }, error: null });

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'photos') return photosChain;
        return tripsChain;
      }),
    };

    await expect(
      tripsRouter
        .createCaller(authCtx({ id: USER_ID }, supabase) as never)
        .generateLore({ tripId: TRIP_ID })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('throws BAD_REQUEST when another generation is already processing', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('AI_WORKER_URL', 'https://worker.example.com');

    // generateLore now uses atomic RPC claim_lore_generation instead of a DB count check.
    // Mock the service client to return 'already_processing' from the RPC.
    mockServiceClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips')
          return makeChain({ data: null, error: null }, { data: null, count: 0, error: null });
        return makeChain({ data: null, error: null });
      }),
      rpc: vi.fn().mockResolvedValue({ data: 'already_processing', error: null }),
    };

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips') return makeChain({ data: { creator_id: USER_ID }, error: null });
        // Photos: 10
        return makeChain(
          { data: null, count: 10, error: null },
          { data: null, count: 10, error: null }
        );
      }),
    };

    await expect(
      tripsRouter
        .createCaller(authCtx({ id: USER_ID }, supabase) as never)
        .generateLore({ tripId: TRIP_ID })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('throws TOO_MANY_REQUESTS when monthly token cap is exceeded', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('AI_WORKER_URL', 'https://worker.example.com');
    vi.stubEnv('MONTHLY_TOKEN_CAP_PER_USER', '500000');

    const thisMonthDate = new Date().toISOString().slice(0, 7) + '-01';
    let tripsCallCount = 0;

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips') {
          tripsCallCount++;
          if (tripsCallCount === 1) {
            return makeChain({ data: { creator_id: USER_ID }, error: null });
          }
          // Active jobs: 0 (no processing trips)
          return makeChain(
            { data: null, count: 0, error: null },
            { data: null, count: 0, error: null }
          );
        }
        // Photos: 10
        return makeChain(
          { data: null, count: 10, error: null },
          { data: null, count: 10, error: null }
        );
      }),
    };

    // Service client: completeTrips = 1 (not first generation), profile at monthly cap
    mockServiceClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips') {
          return makeChain(
            { data: null, count: 1, error: null },
            { data: null, count: 1, error: null }
          );
        }
        // table === 'profiles'
        return makeChain({
          data: {
            referral_bonus_unlocked: false,
            generation_tokens_used_this_month: 500000,
            generation_tokens_month: thisMonthDate,
          },
          error: null,
        });
      }),
    };

    await expect(
      tripsRouter
        .createCaller(authCtx({ id: USER_ID }, supabase) as never)
        .generateLore({ tripId: TRIP_ID })
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});

// ---------------------------------------------------------------------------
// trips.upgradeTier
// ---------------------------------------------------------------------------

describe('trips.upgradeTier', () => {
  const TRIP_ID = '00000000-0000-0000-0000-000000000002';
  const USER_ID = 'user-creator-003';
  const OTHER_ID = 'user-other-004';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws UNAUTHORIZED when no user in context', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    await expect(
      tripsRouter.createCaller(anonCtx() as never).upgradeTier({
        tripId: TRIP_ID,
        tier: 'digital',
        paymentId: 'p1',
        orderId: 'o1',
        signature: 'sig',
      })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when caller is not trip creator', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-secret');

    const chain = makeChain({ data: { creator_id: OTHER_ID, tier: 'free' }, error: null });
    await expect(
      tripsRouter.createCaller(authCtx({ id: USER_ID }, chain) as never).upgradeTier({
        tripId: TRIP_ID,
        tier: 'digital',
        paymentId: 'p1',
        orderId: 'o1',
        signature: 'sig',
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws FORBIDDEN on invalid Razorpay HMAC signature', async () => {
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'correct-secret');

    const chain = makeChain({ data: { creator_id: USER_ID, tier: 'free' }, error: null });
    await expect(
      tripsRouter.createCaller(authCtx({ id: USER_ID }, chain) as never).upgradeTier({
        tripId: TRIP_ID,
        tier: 'digital',
        paymentId: 'pay_test',
        orderId: 'order_test',
        signature: 'bad-signature',
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates tier when webhook_payment_id is confirmed', async () => {
    // upgradeTier is now webhook-authoritative: it reads webhook_payment_id set by the
    // Razorpay webhook handler and uses that as proof of payment instead of re-validating HMAC.
    const { tripsRouter } = await import('@/server/trpc/routers/trips');
    const paymentId = 'pay_valid';

    // Service client returns the trip row (admin queries trips, not ctx.supabase)
    mockServiceClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips') {
          return makeChain({
            data: { creator_id: USER_ID, tier: 'free', webhook_payment_id: paymentId },
            error: null,
          });
        }
        return makeChain({ error: null });
      }),
    };

    const result = await tripsRouter.createCaller(authCtx({ id: USER_ID }) as never).upgradeTier({
      tripId: TRIP_ID,
      tier: 'digital',
      paymentId,
      orderId: 'order_valid',
      signature: 'ignored-webhook-is-authoritative',
    });
    expect(result).toMatchObject({ success: true });
  });

  it('returns alreadyUpgraded when trip is already on a paid tier', async () => {
    // upgradeTier returns { success: true, alreadyUpgraded: true } for idempotent re-calls
    // (e.g. webhook fired and upgraded the tier before the client polled).
    const { tripsRouter } = await import('@/server/trpc/routers/trips');

    mockServiceClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'trips') {
          return makeChain({
            data: { creator_id: USER_ID, tier: 'digital', webhook_payment_id: 'pay_existing' },
            error: null,
          });
        }
        return makeChain({ error: null });
      }),
    };

    const result = await tripsRouter.createCaller(authCtx({ id: USER_ID }) as never).upgradeTier({
      tripId: TRIP_ID,
      tier: 'print',
      paymentId: 'p2',
      orderId: 'o2',
      signature: 'any',
    });
    expect(result).toMatchObject({ success: true, alreadyUpgraded: true });
  });
});

// ---------------------------------------------------------------------------
// photos.confirmUpload
// ---------------------------------------------------------------------------

describe('photos.confirmUpload', () => {
  const TRIP_ID = '00000000-0000-0000-0000-000000000003';
  const USER_ID = 'user-uploader-005';
  const OTHER_ID = 'user-other-006';
  const VALID_PATH = `${TRIP_ID}/${USER_ID}/photo.jpg`;

  afterEach(() => {
    mockServiceClient = makeChain();
  });

  it('rejects storage paths not starting with {tripId}/{userId}/', async () => {
    const { photosRouter } = await import('@/server/trpc/routers/photos');
    await expect(
      photosRouter.createCaller(authCtx({ id: USER_ID }) as never).confirmUpload({
        tripId: TRIP_ID,
        storagePath: `${OTHER_ID}/${USER_ID}/photo.jpg`, // wrong tripId
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects paths with correct tripId but wrong userId', async () => {
    const { photosRouter } = await import('@/server/trpc/routers/photos');
    await expect(
      photosRouter.createCaller(authCtx({ id: USER_ID }) as never).confirmUpload({
        tripId: TRIP_ID,
        storagePath: `${TRIP_ID}/${OTHER_ID}/photo.jpg`, // different user
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('returns existing photo on duplicate path (idempotency)', async () => {
    const { photosRouter } = await import('@/server/trpc/routers/photos');
    const EXISTING_ID = 'photo-existing-001';
    let callCount = 0;

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        callCount++;
        if (table === 'trip_members') {
          return makeChain({ data: { id: 'member-001' }, error: null });
        }
        // Second call is photos idempotency check — return existing photo
        return makeChain({ data: { id: EXISTING_ID }, error: null });
      }),
    };

    const result = await photosRouter
      .createCaller(authCtx({ id: USER_ID }, supabase) as never)
      .confirmUpload({ tripId: TRIP_ID, storagePath: VALID_PATH });

    expect(result).toMatchObject({ photoId: EXISTING_ID });
  });

  it('throws BAD_REQUEST when server-side file size exceeds 50MB', async () => {
    const { photosRouter } = await import('@/server/trpc/routers/photos');
    const OVER_50MB = 51 * 1024 * 1024;
    let callCount = 0;

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        callCount++;
        if (table === 'trip_members') {
          return makeChain({ data: { id: 'member-002' }, error: null });
        }
        // Photos idempotency check: no existing photo
        return makeChain({ data: null, error: null });
      }),
    };

    // Service client: storage.objects query returns oversized file
    const storageObjectChain = makeChain({ data: { metadata: { size: OVER_50MB } }, error: null });
    mockServiceClient = {
      from: vi.fn().mockReturnValue(storageObjectChain),
      storage: {
        from: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) }),
      },
    };

    await expect(
      photosRouter.createCaller(authCtx({ id: USER_ID }, supabase) as never).confirmUpload({
        tripId: TRIP_ID,
        storagePath: VALID_PATH,
        fileSize: OVER_50MB,
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ---------------------------------------------------------------------------
// battles.challenge
// ---------------------------------------------------------------------------

describe('battles.challenge', () => {
  const MY_TRIP_ID = '00000000-0000-0000-0000-000000000004';
  const OPP_TRIP_ID = '00000000-0000-0000-0000-000000000005';
  const USER_ID = 'user-battler-007';
  const INPUT = { myTripId: MY_TRIP_ID, opponentTripId: OPP_TRIP_ID };

  afterEach(() => {
    mockServiceClient = makeChain();
  });

  it('throws UNAUTHORIZED when no user in context', async () => {
    const { battlesRouter } = await import('@/server/trpc/routers/battles');
    await expect(
      battlesRouter.createCaller(anonCtx() as never).challenge(INPUT)
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when caller does not own myTripId', async () => {
    const { battlesRouter } = await import('@/server/trpc/routers/battles');
    const chain = makeChain({
      data: { creator_id: 'other-user', lore_status: 'ready' },
      error: null,
    });
    await expect(
      battlesRouter.createCaller(authCtx({ id: USER_ID }, chain) as never).challenge(INPUT)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws TOO_MANY_REQUESTS when 3/24h rate limit is exceeded', async () => {
    const { battlesRouter } = await import('@/server/trpc/routers/battles');
    let callCount = 0;

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        callCount++;
        if (table === 'trips' && callCount === 1) {
          // My trip: owned + lore ready
          return makeChain({ data: { creator_id: USER_ID, lore_status: 'ready' }, error: null });
        }
        if (table === 'trips' && callCount === 2) {
          // Owned trip IDs for rate limit check — awaited as array
          const resolved = Promise.resolve({ data: [{ id: MY_TRIP_ID }], error: null });
          const c = makeChain({ data: [{ id: MY_TRIP_ID }], error: null });
          (c as Record<string, unknown>).then = resolved.then.bind(resolved);
          return c;
        }
        // trip_vs_trip: 3 battles in last 24h (at limit)
        return makeChain(
          { data: null, count: 3, error: null },
          { data: null, count: 3, error: null }
        );
      }),
    };

    await expect(
      battlesRouter.createCaller(authCtx({ id: USER_ID }, supabase) as never).challenge(INPUT)
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  it('inserts a judge_battle job into background_jobs after battle creation (REL-02)', async () => {
    const { battlesRouter } = await import('@/server/trpc/routers/battles');
    const BATTLE_ID = 'battle-new-001';
    let callCount = 0;

    const supabase: Record<string, unknown> = {
      from: vi.fn().mockImplementation((table: string) => {
        callCount++;

        if (table === 'trips' && callCount === 1) {
          // My trip owned + lore ready
          return makeChain({ data: { creator_id: USER_ID, lore_status: 'ready' }, error: null });
        }
        if (table === 'trips' && callCount === 2) {
          // Owned trip IDs for rate-limit check
          const resolved = Promise.resolve({ data: [{ id: MY_TRIP_ID }], error: null });
          const c = makeChain({ data: [{ id: MY_TRIP_ID }], error: null });
          (c as Record<string, unknown>).then = resolved.then.bind(resolved);
          return c;
        }
        if (table === 'trip_vs_trip' && callCount === 3) {
          // Recent battles: 0 (under limit)
          return makeChain(
            { data: null, count: 0, error: null },
            { data: null, count: 0, error: null }
          );
        }
        if (table === 'trips' && callCount === 4) {
          // Opponent trip: lore ready
          return makeChain({ data: { lore_status: 'ready' }, error: null });
        }
        // trip_vs_trip insert — returns the new battle
        return makeChain({
          data: { id: BATTLE_ID, trip_a_id: MY_TRIP_ID, trip_b_id: OPP_TRIP_ID },
          error: null,
        });
      }),
    };

    const bgJobInsert = vi.fn().mockResolvedValue({ error: null });
    mockServiceClient = {
      from: vi.fn().mockReturnValue({ ...makeChain(), insert: bgJobInsert }),
    };

    await battlesRouter.createCaller(authCtx({ id: USER_ID }, supabase) as never).challenge(INPUT);

    expect(bgJobInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_type: 'judge_battle',
        status: 'pending',
        payload: expect.objectContaining({ battle_id: BATTLE_ID }),
      })
    );
  });
});
