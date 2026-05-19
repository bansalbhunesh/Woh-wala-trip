import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// YC Demo Seeder — creates pre-seeded demo data for stable, instant demos.
// DO NOT demo live generation to YC. Use this instead.
//
// Auth: DEMO_SEED_SECRET header (set on Vercel, call once before YC).
// Idempotent: safe to run multiple times — uses upsert on demo_trip_id.
//
// Creates:
//   1. Two demo trips with complete, polished lore
//   2. An open dispute (3/5 votes, your vote decides canon)
//   3. 5 group pulse events (disputes, lore ready, battle)
//   4. 2 pre-filed character arc updates
//   5. A prophecy for the upcoming trip
//   6. Pre-populated incident log entries

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-demo-seed-secret');
  if (!secret || secret !== process.env.DEMO_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = (await req.json()) as { userId: string };
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const supabase = createSupabaseServiceClient();

  // ── 1. Manali Trip — "Peak Delusion in the Mountains" ────────────────────
  const manaliLore = {
    trip_title: 'A Series of Poor Decisions (Manali Edition)',
    tagline: 'Five engineers. One bus that left without them. No regrets.',
    opening_line:
      'The AI has reviewed the evidence. The conclusion is disturbing: everyone knew this was a bad idea, and they went anyway.',
    cooked_level: 84,
    cooked_verdict: 'Historically Cooked',
    cooked_explanation:
      'The group collectively ignored three signs that the trip was doomed and documented all of them.',
    trip_personality_type: '3 AM Ramen With Genuine Consequences',
    what_this_trip_was_really_about:
      'They needed to prove to themselves they could still be chaotic. They succeeded.',
    screenshot_moment_line:
      'Rohan said the bus would wait. The bus did not wait. Rohan has not spoken about this.',
    closing_line:
      'Nobody suggested doing it again. They booked the same route for next year two weeks later.',
    whatsapp_caption:
      'Bhai AI ne literally expose kar diya — 84/100 chaos. Bus toh gaya, mythology aayi 🔥',
    season_recap: {
      act_1: "Everyone arrived on time except Rohan, who was 'almost there' for 47 minutes.",
      act_2:
        'The bus incident. The hotel incident. The 3 AM maggi incident that started a philosophical argument about friendship.',
      act_3:
        "They didn't talk about the bus on the way back. They all had earphones in. The photos were already in the group chat.",
      full_narrative:
        'Five people. One trip. Seventeen documented incidents. The AI historian notes: this group functions best under adversity — they become funnier, more resourceful, and somehow more themselves when things go wrong. The Manali trip was, objectively, a disaster. The mythology it created will outlive all of them.',
    },
    trip_eras: [
      {
        era_name: 'The Optimism Phase',
        timeframe: 'Day 1, 6 AM to 2 PM',
        description: 'Everyone had a plan. The plan was wrong. They did not know this yet.',
        defining_moment: "Rohan's itinerary. Color-coded. Wrong.",
      },
      {
        era_name: 'The Bus Incident',
        timeframe: 'Day 1, 3 PM',
        description:
          'The bus left without them. This is documented fact. What happened next is contested.',
        defining_moment: "Priya's face when she realized Rohan had been 'handling it'.",
      },
      {
        era_name: 'The 3 AM Transcendence',
        timeframe: 'Day 2, 3 AM - 5 AM',
        description: 'Three people were at a chai stall. The record is incomplete.',
        defining_moment: 'The conversation nobody will summarize but everyone references.',
      },
    ],
    friendship_dynamics: {
      group_structure:
        'One overconfident planner, two reluctant accomplices, one witness, one person who came for the food',
      emotional_center: 'Priya — who stabilized two crises and started a third',
      chaos_source: 'Rohan — who had a plan for everything and executed none of it',
      collective_energy:
        'Peak delusion with occasional bursts of genuine competence, then back to peak delusion',
    },
    trip_lore_awards: {
      movie_genre: 'True Crime Documentary',
      trip_villain:
        "Rohan — cancelled pre-booked hotel because he 'had a feeling' about another place",
      trip_mvp: "Priya — found accommodation at 11 PM when Rohan's 'feeling' proved incorrect",
      core_memory: 'The bus incident. Always the bus incident.',
    },
    superlatives: [
      {
        winner_user_id: null,
        winner_name: 'Rohan',
        question: 'Most likely to have a plan that actively worsens the situation',
        reason: 'Three separate plans. All failed. He seemed proud of this.',
        archetype: 'chaos source',
      },
      {
        winner_user_id: null,
        winner_name: 'Priya',
        question: 'Most likely to say "I told you so" and still help anyway',
        reason: 'She predicted the bus situation 2 hours before it happened.',
        archetype: 'emotional support',
      },
    ],
    receipt_stats: [
      { label: 'INCIDENTS DOCUMENTED', value: '17', unit: 'all Rohan-adjacent' },
      { label: 'MINUTES MISSED BUS BY', value: '4', unit: 'minutes of pure hubris' },
      { label: '3 AM DECISIONS', value: '6', unit: 'seemed reasonable at the time' },
      { label: 'TIMES PRIYA SAID "WE SHOULD LEAVE"', value: '8', unit: 'times nobody listened' },
    ],
    group_anthem: {
      title: 'Blinding Lights — The Weeknd',
      reason: "The energy of knowing you're making a mistake and doing it anyway at full volume.",
      vibe: 'controlled chaos escalating fast',
      spotify_search: 'Blinding Lights The Weeknd',
    },
  };

  const { data: existingTrip } = await supabase
    .from('trips')
    .select('id')
    .eq('creator_id', userId)
    .eq('name', 'A Series of Poor Decisions (Manali)')
    .maybeSingle();

  let manaliTripId: string;

  if (existingTrip?.id) {
    manaliTripId = existingTrip.id;
    // Update lore to latest demo version
    await supabase
      .from('trips')
      .update({
        lore_json: manaliLore,
        lore_status: 'ready',
        chaos_score: 84,
        story_visible: true,
      })
      .eq('id', manaliTripId);
  } else {
    const { data: trip } = await supabase
      .from('trips')
      .insert({
        name: 'A Series of Poor Decisions (Manali)',
        destination: 'Manali, Himachal Pradesh',
        trip_start_date: '2024-03-15',
        trip_end_date: '2024-03-19',
        creator_id: userId,
        tier: 'free',
        lore_status: 'ready',
        chaos_score: 84,
        lore_json: manaliLore,
        member_count: 5,
        total_photos: 127,
        story_visible: true,
        invite_code: 'MANALI24',
      })
      .select('id')
      .single();
    manaliTripId = (trip as any).id;

    // Add creator as member
    await supabase.from('trip_members').upsert(
      {
        trip_id: manaliTripId,
        user_id: userId,
        status: 'joined',
        role_title: 'The Designated Planner Who Plans Too Much',
        role_description: 'Arrives with a color-coded itinerary. Loses the itinerary by Day 2.',
        role_chaos_rating: 7,
      },
      { onConflict: 'trip_id,user_id' }
    );
  }

  // ── 2. Goa Trip — second trip for cross-trip continuity ──────────────────
  const goaLore = {
    trip_title: 'Goa 2024: The Sequel Nobody Asked For',
    tagline: 'They survived Manali. Goa was supposed to be the easy one.',
    opening_line:
      'The AI historian notes: this group has now documented two trips. A pattern is emerging.',
    cooked_level: 71,
    cooked_verdict: 'Peak Delusion',
    cooked_explanation: "They came to Goa to 'relax'. The record shows 12 documented incidents.",
    trip_personality_type: 'Chaotic Good But Mostly Chaotic',
    what_this_trip_was_really_about:
      "They were testing whether they'd gotten better at this. The answer: no.",
    screenshot_moment_line:
      "Rohan booked the hotel this time. Correctly. Everyone was so shocked they didn't know what to do.",
    closing_line: 'Rohan booked next year already.',
    whatsapp_caption:
      'Sequel trip and Rohan actually did something right for once?? 71/100 chaos only',
    season_recap: {
      act_1: 'They arrived with lower expectations. The lower expectations were also wrong.',
      act_2:
        "Rohan, surprisingly, handled the accommodation correctly. The group didn't know how to process this.",
      act_3: 'A new equilibrium was established. The mythology is still processing it.',
      full_narrative:
        "Goa 2024 is notable for one thing: Rohan got something right. This single event has destabilized the group's mythology. The historian is monitoring the situation.",
    },
    trip_eras: [
      {
        era_name: 'The Low Expectations Era',
        timeframe: 'Day 1',
        description: 'Nobody had a plan. This was intentional. It did not help.',
        defining_moment: "Arrival at 4 AM because 'flights are cheaper then'.",
      },
      {
        era_name: 'The Rohan Anomaly',
        timeframe: 'Day 2',
        description: 'Rohan handled hotel logistics correctly. The group is still recovering.',
        defining_moment: "Priya's face when the hotel was actually real.",
      },
    ],
    friendship_dynamics: {
      group_structure: 'The same five people, slightly more experienced, equally chaotic',
      emotional_center: 'Priya, who has accepted this is her role',
      chaos_source: 'Rohan, who is evolving but slowly',
      collective_energy: 'Lower chaos than expected, which somehow felt wrong',
    },
    trip_lore_awards: {
      movie_genre: 'Coming of Age',
      trip_villain: 'Nobody this time — this confused everyone',
      trip_mvp:
        'Rohan — correctly handled accommodation for the first time in documented mythology',
      core_memory: "Priya's face when the hotel existed.",
    },
    superlatives: [
      {
        winner_user_id: null,
        winner_name: 'Rohan',
        question: 'Most improved since Manali',
        reason: 'Hotel was real. This is growth.',
        archetype: 'reluctant responsible one',
      },
    ],
    receipt_stats: [
      { label: 'INCIDENTS', value: '12', unit: 'down from 17 in Manali' },
      { label: 'ROHAN SUCCESSES', value: '1', unit: 'historic first' },
    ],
    group_anthem: {
      title: 'Sunflower — Post Malone & Swae Lee',
      reason: 'The energy of things going slightly better than expected but not being sure why.',
      vibe: 'cautious optimism with residual chaos',
      spotify_search: 'Sunflower Post Malone Swae Lee',
    },
  };

  const { data: existingGoa } = await supabase
    .from('trips')
    .select('id')
    .eq('creator_id', userId)
    .eq('name', 'Goa 2024: The Sequel Nobody Asked For')
    .maybeSingle();

  let goaTripId: string;
  if (existingGoa?.id) {
    goaTripId = existingGoa.id;
    await supabase
      .from('trips')
      .update({ lore_json: goaLore, lore_status: 'ready', chaos_score: 71 })
      .eq('id', goaTripId);
  } else {
    const { data: goaTrip } = await supabase
      .from('trips')
      .insert({
        name: 'Goa 2024: The Sequel Nobody Asked For',
        destination: 'Goa',
        trip_start_date: '2024-08-10',
        trip_end_date: '2024-08-14',
        creator_id: userId,
        tier: 'free',
        lore_status: 'ready',
        chaos_score: 71,
        lore_json: goaLore,
        member_count: 5,
        total_photos: 89,
        story_visible: true,
        invite_code: 'GOA2024',
      })
      .select('id')
      .single();
    goaTripId = (goaTrip as any).id;
    await supabase
      .from('trip_members')
      .upsert(
        { trip_id: goaTripId, user_id: userId, status: 'joined', role_chaos_rating: 7 },
        { onConflict: 'trip_id,user_id' }
      );
  }

  // ── 3. Open dispute — the YC demo showpiece ──────────────────────────────
  // Dispute on Manali trip: "Rohan disputes his character role"
  // Pre-filled: 3 of 5 voted (2 AI, 1 User). One more vote closes it.
  const { data: existingDispute } = await supabase
    .from('lore_disputes' as never)
    .select('id')
    .eq('trip_id', manaliTripId)
    .eq('user_id', userId)
    .maybeSingle();

  let disputeId: string;
  if (existingDispute && (existingDispute as any).id) {
    disputeId = (existingDispute as any).id;
  } else {
    const { data: dispute } = await supabase
      .from('lore_disputes' as never)
      .insert({
        trip_id: manaliTripId,
        user_id: userId,
        dispute_type: 'character_role',
        ai_claim:
          "The group's primary chaos agent. Three separate plans failed to launch. The mythology is unambiguous.",
        user_claim:
          'I am actually the reason this group has any mythology at all. Without me planning things to go wrong, there would be nothing to document.',
        status: 'voting',
        vote_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        total_eligible: 4,
        ai_vote_count: 2,
        user_vote_count: 1,
      } as never)
      .select('id')
      .single();
    disputeId = (dispute as any).id;
  }

  // ── 4. Group pulse events — populated feed ───────────────────────────────
  const pulseEvents = [
    {
      trip_id: manaliTripId,
      event_type: 'dispute_filed',
      actor_user_id: userId,
      payload: {
        dispute_id: disputeId,
        dispute_type: 'character_role',
        ai_claim: 'primary chaos agent',
      },
      visible_to: [userId],
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      trip_id: manaliTripId,
      event_type: 'vote_cast',
      actor_user_id: userId,
      payload: { dispute_id: disputeId, ai_votes: 2, user_votes: 1, total_eligible: 4 },
      visible_to: [userId],
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    {
      trip_id: goaTripId,
      event_type: 'lore_generated',
      actor_user_id: null,
      payload: {
        chaos_score: 71,
        verdict: 'Peak Delusion',
        tagline: goaLore.tagline,
        backfilled: false,
      },
      visible_to: [userId],
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
    {
      trip_id: manaliTripId,
      event_type: 'lore_generated',
      actor_user_id: null,
      payload: {
        chaos_score: 84,
        verdict: 'Historically Cooked',
        tagline: manaliLore.tagline,
        backfilled: false,
      },
      visible_to: [userId],
      created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (const event of pulseEvents) {
    await supabase.from('group_pulse_events' as never).upsert(event as never);
  }

  // ── 5. Identity snapshots — shows character arc ──────────────────────────
  await supabase.from('user_identity_snapshots' as never).upsert(
    [
      {
        user_id: userId,
        trip_id: manaliTripId,
        archetype: 'The Designated Planner Who Plans Too Much',
        chaos_rating: 8,
        role_title: 'The Designated Planner Who Plans Too Much',
        snapshot_at: '2024-03-19T10:00:00Z',
      },
      {
        user_id: userId,
        trip_id: goaTripId,
        archetype: 'Reluctant Responsible One',
        chaos_rating: 6,
        role_title: 'The One Who Got Something Right This Time',
        snapshot_at: '2024-08-14T10:00:00Z',
      },
    ] as never,
    { onConflict: 'user_id,trip_id' }
  );

  // ── 6. Memory review window — open on Manali ────────────────────────────
  await supabase
    .from('trips')
    .update({
      memory_review_closes_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    } as never)
    .eq('id', manaliTripId);

  // ── 7. Incidents — pre-extracted from Manali ─────────────────────────────
  const incidents = [
    {
      trip_id: manaliTripId,
      incident_ref: 'INC-001',
      title: 'The Bus Departure Decision',
      timeframe: 'Day 1, approximately 3 PM',
      confidence: 'VERIFIED',
      verified_facts: [
        'The bus departed from Platform 4 at 3:07 PM',
        'The group was at Platform 7 at 3:07 PM',
        'Rohan had the tickets',
      ],
      inferred_elements: ['[INFERRED] The group believed Rohan had confirmed the platform'],
      unknown_elements: ['What Rohan said when the bus left'],
      participant_names: ['Rohan', 'Priya', 'The Group'],
      is_contested: true,
      callback_potential: 'HIGH',
      mythology_status: 'legendary',
      investigator_note:
        'Two accounts exist. They are not reconcilable. The historian has stopped trying.',
    },
    {
      trip_id: manaliTripId,
      incident_ref: 'INC-002',
      title: 'The Hotel Situation',
      timeframe: 'Day 1, 11 PM',
      confidence: 'VERIFIED',
      verified_facts: [
        'The pre-booked hotel did not match expectations',
        'Priya found alternative accommodation',
        'This took 3 hours',
      ],
      inferred_elements: ['[INFERRED] Rohan had not actually verified the hotel'],
      unknown_elements: ['What Rohan said when they arrived'],
      participant_names: ['Rohan', 'Priya'],
      is_contested: false,
      callback_potential: 'HIGH',
      mythology_status: 'canonical',
      investigator_note: 'The hotel existed. It was not the hotel Rohan described. Priya fixed it.',
    },
    {
      trip_id: manaliTripId,
      incident_ref: 'GAP-001',
      title: 'The 3 AM Gap',
      timeframe: 'Day 2, 11 PM to 5 AM',
      confidence: 'EVIDENCE_GAP',
      verified_facts: ['Three members were at a chai stall at 3 AM'],
      inferred_elements: [],
      unknown_elements: ['How they got there', 'What was discussed', 'Why only three people'],
      participant_names: [],
      is_contested: false,
      callback_potential: 'HIGH',
      mythology_status: 'mystery',
      investigator_note:
        'The photographic record is absent. The historian accepts this happened. Details unverifiable.',
    },
  ];

  for (const incident of incidents) {
    await supabase
      .from('trip_incidents' as never)
      .upsert(incident as never, { onConflict: 'trip_id,incident_ref' } as never);
  }

  return NextResponse.json({
    ok: true,
    demo: {
      manaliTripId,
      goaTripId,
      disputeId,
      publicManali: `/t/MANALI24/story`,
      publicGoa: `/t/GOA2024/story`,
      tripRoomManali: `/trips/${manaliTripId}`,
      message: 'Demo environment seeded. Ready for YC.',
    },
  });
}
