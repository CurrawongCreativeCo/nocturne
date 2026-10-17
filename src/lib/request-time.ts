import 'server-only'

import { connection } from 'next/server'

/**
 * The time of the visitor's request, in milliseconds. Pages are cached, so the clock may not be read
 * while one is prerendered; this waits for a real request first. Call it inside a <Suspense> boundary
 * of its own, so only that part of the page is rendered per request and the rest stays prerendered.
 */
export async function requestTime(): Promise<number> {
  await connection()
  return Date.now()
}
