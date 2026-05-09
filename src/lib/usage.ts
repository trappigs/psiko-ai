export type Usage = { session_count: number; token_count: number } | null;
export type Limits = { dailySessions: number; dailyTokens: number };

export function defaultLimits(): Limits {
  return {
    dailySessions: Number(process.env.DAILY_SESSION_LIMIT ?? 5),
    dailyTokens: Number(process.env.DAILY_TOKEN_LIMIT ?? 100_000),
  };
}

export type LimitResult = false | { reason: 'sessions' | 'tokens' };

export function isOverDailyLimit(u: Usage, limits: Limits): LimitResult {
  if (!u) return false;
  if (u.session_count >= limits.dailySessions) return { reason: 'sessions' };
  if (u.token_count >= limits.dailyTokens) return { reason: 'tokens' };
  return false;
}
