import { cookies } from 'next/headers'

import { MarkVisited } from './mark-visited'
import { VISITED_COOKIE } from '../utils/visited-cookie'

/**
 * Reference example of personalization inside a cached page. The page itself stays prerendered;
 * only this component reads the request, so it must render inside <Suspense> and never inside
 * a 'use cache' function. First visit: nothing visible, and the cookie is set for next time.
 */
export async function ReturningVisitor() {
  const returning = (await cookies()).has(VISITED_COOKIE)
  if (!returning) return <MarkVisited />

  return <p className="mt-4 text-small font-medium text-ink-inverse-muted">Welcome back!</p>
}
