export function sessionDurationMinutes(): number {
  return Number(process.env.SESSION_DURATION_MINUTES ?? 45);
}

export function remainingSeconds(startedAt: Date, now: Date = new Date()): number {
  const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  const total = sessionDurationMinutes() * 60;
  return Math.max(0, total - elapsed);
}

export function isExpired(startedAt: Date, now: Date = new Date()): boolean {
  return remainingSeconds(startedAt, now) === 0;
}
