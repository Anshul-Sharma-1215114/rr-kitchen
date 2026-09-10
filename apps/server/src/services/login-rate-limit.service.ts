// Same in-memory approach as otp.service.ts's attempt limiter, applied to
// password logins (admin/delivery agent) — those had the same
// brute-forceable-with-no-lockout gap that OTP verify did. Single-process
// only; move to a shared store (Redis) before running multiple instances.
export class LoginRateLimitError extends Error {}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function assertNotLocked(key: string): void {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil > Date.now()) {
    throw new LoginRateLimitError("Too many failed login attempts — please try again in a few minutes");
  }
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  // No record yet, or a previous lockout has expired — start counting fresh.
  if (!entry || (entry.lockedUntil > 0 && entry.lockedUntil <= now)) {
    attempts.set(key, { count: 1, lockedUntil: 0 });
    return;
  }
  const count = entry.count + 1;
  attempts.set(key, { count, lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0 });
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
