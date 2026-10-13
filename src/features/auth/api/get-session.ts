import 'server-only'

import { auth } from './auth'
import { isAllowedMember, parseAllowList } from '../utils/allowed-members'

export interface MemberSession {
  name: string | null
  email: string | null
}

/**
 * The signed-in member, or null. Reads the session cookie, so it can only run at request time:
 * call it from a component inside <Suspense>, never inside a `'use cache'` function. The allow-list
 * is checked again here, so removing someone from it ends their session at once, not at expiry.
 */
export async function getSession(): Promise<MemberSession | null> {
  const session = await auth()
  const user = session?.user
  if (!user) return null
  if (!isAllowedMember(user.email, parseAllowList(process.env.AUTH_ALLOWED_EMAILS))) return null
  return { name: user.name ?? null, email: user.email ?? null }
}
