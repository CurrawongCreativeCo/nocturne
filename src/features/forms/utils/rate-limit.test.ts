import { describe, expect, it } from 'vitest'

import { createRateLimiter } from './rate-limit'

const MINUTE = 60_000

describe('createRateLimiter', () => {
  it('allows the limit, then blocks and says how long to wait', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 10 * MINUTE })
    expect(limiter.take('a', 0)).toEqual({ allowed: true })
    expect(limiter.take('a', 1 * MINUTE)).toEqual({ allowed: true })
    expect(limiter.take('a', 2 * MINUTE)).toEqual({ allowed: false, retryAfterMs: 8 * MINUTE })
  })

  it('counts each key on its own', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: MINUTE })
    expect(limiter.take('a', 0).allowed).toBe(true)
    expect(limiter.take('b', 0).allowed).toBe(true)
    expect(limiter.take('a', 1).allowed).toBe(false)
  })

  it('frees a slot as the window slides past old attempts', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 10 * MINUTE })
    limiter.take('a', 0)
    limiter.take('a', 5 * MINUTE)
    expect(limiter.take('a', 9 * MINUTE).allowed).toBe(false)
    expect(limiter.take('a', 10 * MINUTE).allowed).toBe(true)
    expect(limiter.take('a', 11 * MINUTE).allowed).toBe(false)
  })

  it('doesn’t count blocked attempts, so waiting always works', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10 * MINUTE })
    limiter.take('a', 0)
    for (let t = 1; t < 10; t++) expect(limiter.take('a', t * MINUTE).allowed).toBe(false)
    expect(limiter.take('a', 10 * MINUTE).allowed).toBe(true)
  })

  it('forgets the least recently used keys past maxKeys', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10 * MINUTE, maxKeys: 2 })
    limiter.take('a', 0)
    limiter.take('b', 1)
    limiter.take('c', 2) // pushes "a" out
    expect(limiter.take('a', 3).allowed).toBe(true)
    expect(limiter.take('c', 4).allowed).toBe(false)
  })
})
