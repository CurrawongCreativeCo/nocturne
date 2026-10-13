import 'server-only'

import { createRateLimiter } from '../utils/rate-limit'

/**
 * Five messages per IP per ten minutes, per server instance. Lives in its own module because a
 * `'use server'` file may only export async functions.
 */
export const submissionLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
