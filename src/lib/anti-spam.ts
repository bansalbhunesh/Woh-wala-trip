/**
 * Anti-spam and fraud-prevention utilities.
 *
 * Layers:
 *   1. Format validation (regex, local-only, fast)
 *   2. Disposable domain blocklist (in-process, 60+ domains)
 *   3. mailcheck.js-style typo detection (typo warnings, not blocks)
 *   4. Third-party API validation (Disify, Abstract API, Kickbox — opt-in via env)
 *   5. Composite fraud score (signals → block/warn/allow)
 *   6. In-memory IP burst protection
 *   7. Logging/analytics for all blocked attempts
 */

// ── 1. Format ──────────────────────────────────────────────────────────────

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── 2. Disposable domain blocklist ─────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.info',
  'tempmail.com',
  'temp-mail.org',
  'throwam.com',
  'throwaway.email',
  'dispostable.com',
  'yopmail.com',
  'yopmail.fr',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'trashmail.at',
  'trashmail.io',
  'trashmail.xyz',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'spam4.me',
  'maildrop.cc',
  'mailnull.com',
  'mailnesia.com',
  'filzmail.com',
  'discard.email',
  'mailnew.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'getonemail.com',
  'kurzepost.de',
  'mailexpire.com',
  'spamhereplease.com',
  'spamfree24.org',
  'trashdevil.com',
  'fakeinbox.com',
  'fakeinbox.net',
  'spambox.us',
  'spam.la',
  'bugmenot.com',
  'boximail.com',
  'chitthi.in',
  'tempinbox.com',
  '10minutemail.com',
  '10minutemail.net',
  'minutemail.com',
  'mohmal.com',
  'tempr.email',
  'dropmail.me',
  'mytemp.email',
  'inboxbear.com',
  'emailtemp.org',
  'getnada.com',
  'crazymailing.com',
  'mailsac.com',
  'guerrillamail.biz',
  'spamgourmet.org',
  'throwam.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@').pop();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

// ── 2.5. Role / system account detection ──────────────────────────────────

const ROLE_ACCOUNTS = new Set([
  'postmaster',
  'abuse',
  'noreply',
  'no-reply',
  'admin',
  'root',
  'webmaster',
  'hostmaster',
  'support',
  'info',
  'help',
  'security',
  'bounce',
  'mailer-daemon',
  'listserv',
  'majordomo',
  'donotreply',
  'do-not-reply',
  'unsubscribe',
  'contact',
  'newsletter',
  'billing',
  'sales',
  'marketing',
  'hr',
  'careers',
  'jobs',
  'legal',
  'privacy',
]);

export function isRoleAccount(email: string): boolean {
  const local = email.toLowerCase().split('@')[0];
  if (!local) return false;
  return ROLE_ACCOUNTS.has(local);
}

// ── 3. Typo detection (mailcheck-style) ────────────────────────────────────

const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'fastmail.com',
  'hey.com',
  'proton.me',
  'rediffmail.com',
  'yahoo.co.in',
  'ymail.com',
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function detectDomainTypo(email: string): string | null {
  const domain = email.toLowerCase().split('@').pop();
  if (!domain) return null;
  // Exact match — not a typo
  if (COMMON_DOMAINS.includes(domain)) return null;
  for (const known of COMMON_DOMAINS) {
    if (levenshtein(domain, known) <= 2) {
      return known; // suggested correction
    }
  }
  return null;
}

// ── 4. Third-party API validation ──────────────────────────────────────────

export type ThirdPartyResult = {
  provider: string;
  isDisposable: boolean;
  isValid: boolean;
  riskScore: number; // 0-1
  raw?: unknown;
};

/** Disify API — free, no key required */
export async function checkDisify(email: string): Promise<ThirdPartyResult | null> {
  try {
    const res = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { format: boolean; disposable: boolean };
    return {
      provider: 'disify',
      isDisposable: data.disposable === true,
      isValid: data.format === true,
      riskScore: data.disposable ? 1 : 0,
      raw: data,
    };
  } catch {
    return null;
  }
}

/** Abstract API — requires ABSTRACT_API_KEY env var */
export async function checkAbstractAPI(email: string): Promise<ThirdPartyResult | null> {
  const apiKey = process.env.ABSTRACT_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      is_disposable_email: { value: boolean };
      is_valid_format: { value: boolean };
      quality_score: string;
    };
    const score = parseFloat(data.quality_score ?? '0');
    return {
      provider: 'abstractapi',
      isDisposable: data.is_disposable_email?.value === true,
      isValid: data.is_valid_format?.value === true,
      riskScore: 1 - score,
      raw: data,
    };
  } catch {
    return null;
  }
}

/** Kickbox API — requires KICKBOX_API_KEY env var */
export async function checkKickbox(email: string): Promise<ThirdPartyResult | null> {
  const apiKey = process.env.KICKBOX_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.kickbox.com/v2/verify?email=${encodeURIComponent(email)}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result: string;
      reason: string;
      disposable: boolean;
      sendex: number;
    };
    return {
      provider: 'kickbox',
      isDisposable: data.disposable === true,
      isValid: data.result === 'deliverable',
      riskScore: 1 - (data.sendex ?? 0),
      raw: data,
    };
  } catch {
    return null;
  }
}

// ── 5. Composite fraud score ────────────────────────────────────────────────

export type FraudCheckResult = {
  allowed: boolean;
  action: 'allow' | 'warn' | 'block';
  reason: string | null;
  fraudScore: number; // 0-100
  signals: {
    formatInvalid: boolean;
    disposableLocal: boolean;
    isRoleAccount: boolean;
    disposableApi: boolean;
    typoSuggestion: string | null;
    apiResults: ThirdPartyResult[];
  };
};

export async function computeFraudScore(email: string): Promise<FraudCheckResult> {
  const normalized = normalizeEmail(email);

  const formatInvalid = !isValidEmailFormat(normalized);
  const disposableLocal = isDisposableEmail(normalized);
  const roleAccount = isRoleAccount(normalized);
  const typoSuggestion = detectDomainTypo(normalized);

  let fraudScore = 0;
  if (formatInvalid) fraudScore += 100;
  if (disposableLocal) fraudScore += 80;
  if (roleAccount) fraudScore += 80;

  // Fast-exit for local-only signals
  if (formatInvalid) {
    return {
      allowed: false,
      action: 'block',
      reason: 'Invalid email format',
      fraudScore: 100,
      signals: {
        formatInvalid,
        disposableLocal,
        isRoleAccount: roleAccount,
        disposableApi: false,
        typoSuggestion,
        apiResults: [],
      },
    };
  }
  if (disposableLocal) {
    logBlockedAttempt(normalized, 'disposable_local', 80);
    return {
      allowed: false,
      action: 'block',
      reason: 'Disposable email addresses are not allowed. Use a real email to join Yaarlore.',
      fraudScore: 80,
      signals: {
        formatInvalid,
        disposableLocal,
        isRoleAccount: roleAccount,
        disposableApi: false,
        typoSuggestion,
        apiResults: [],
      },
    };
  }
  if (roleAccount) {
    logBlockedAttempt(normalized, 'role_account', 80);
    return {
      allowed: false,
      action: 'block',
      reason:
        'This looks like a system or role email address. Use your personal email to join Yaarlore.',
      fraudScore: 80,
      signals: {
        formatInvalid,
        disposableLocal,
        isRoleAccount: true,
        disposableApi: false,
        typoSuggestion,
        apiResults: [],
      },
    };
  }

  // Run third-party checks in parallel (non-blocking — only fire if keys configured)
  const apiResults = (
    await Promise.all([
      checkDisify(normalized),
      checkAbstractAPI(normalized),
      checkKickbox(normalized),
    ])
  ).filter((r): r is ThirdPartyResult => r !== null);

  const disposableApi = apiResults.some(r => r.isDisposable);
  const avgApiRisk =
    apiResults.length > 0 ? apiResults.reduce((s, r) => s + r.riskScore, 0) / apiResults.length : 0;

  fraudScore += disposableApi ? 80 : Math.round(avgApiRisk * 40);

  const action: 'allow' | 'warn' | 'block' =
    fraudScore >= 70 ? 'block' : fraudScore >= 30 ? 'warn' : 'allow';

  if (action === 'block') {
    logBlockedAttempt(normalized, 'api_fraud_score', fraudScore);
  } else if (typoSuggestion) {
    logBlockedAttempt(normalized, 'typo_suspect', fraudScore);
  }

  return {
    allowed: action !== 'block',
    action,
    reason:
      action === 'block'
        ? 'This email address appears to be disposable or invalid. Use a real email to join Yaarlore.'
        : null,
    fraudScore,
    signals: {
      formatInvalid,
      disposableLocal,
      isRoleAccount: roleAccount,
      disposableApi,
      typoSuggestion,
      apiResults,
    },
  };
}

// ── 6. Rate limiter ────────────────────────────────────────────────────────

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count++;
  return true;
}

// ── 7. Blocked attempt logging ─────────────────────────────────────────────

type BlockEvent = {
  email: string;
  reason: string;
  fraudScore: number;
  timestamp: string;
};

// In-memory ring buffer for analytics (max 200 entries)
const BLOCK_LOG: BlockEvent[] = [];
const MAX_LOG_SIZE = 200;

export function logBlockedAttempt(email: string, reason: string, fraudScore: number): void {
  const event: BlockEvent = {
    email: email.replace(/^(.{2}).*@/, '$1***@'), // mask for privacy
    reason,
    fraudScore,
    timestamp: new Date().toISOString(),
  };
  BLOCK_LOG.push(event);
  if (BLOCK_LOG.length > MAX_LOG_SIZE) BLOCK_LOG.shift();
  console.warn(`[anti-spam] blocked: ${event.email} reason=${reason} score=${fraudScore}`);
}

export function getBlockLog(): readonly BlockEvent[] {
  return BLOCK_LOG;
}

// ── Legacy fast-path check (used in send-otp route) ───────────────────────

export async function checkEmail(raw: string): Promise<string | null> {
  const result = await computeFraudScore(raw);
  return result.allowed ? null : result.reason;
}
