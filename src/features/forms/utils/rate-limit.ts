export interface RateLimiter {
  /** Records an attempt for `key`. `retryAfterMs` says how long until one would be allowed again. */
  take(key: string, now?: number): { allowed: true } | { allowed: false; retryAfterMs: number }
}

interface Options {
  /** Attempts allowed per window, per key. */
  limit: number
  windowMs: number
  /** Most keys remembered at once; the oldest are forgotten first, so memory stays bounded. */
  maxKeys?: number
}

/**
 * A sliding-window limiter held in memory. It limits per server instance: on serverless each
 * instance counts alone, so this slows a spammer down rather than stopping a determined one.
 * Blocked attempts aren't recorded, so waiting out the window always works.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: Options): RateLimiter {
  const attempts = new Map<string, number[]>()

  return {
    take(key, now = Date.now()) {
      const recent = (attempts.get(key) ?? []).filter((time) => now - time < windowMs)

      if (recent.length >= limit) {
        attempts.set(key, recent)
        return { allowed: false, retryAfterMs: (recent[0] ?? now) + windowMs - now }
      }

      recent.push(now)
      // Re-inserting moves the key to the end, so the first key is always the least recently used.
      attempts.delete(key)
      attempts.set(key, recent)
      if (attempts.size > maxKeys) {
        const oldest = attempts.keys().next().value
        if (oldest !== undefined) attempts.delete(oldest)
      }
      return { allowed: true }
    },
  }
}
