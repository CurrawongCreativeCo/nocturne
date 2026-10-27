import 'server-only'

import { client } from './client'
import type { RoleUser } from './roles'

/** How long Sanity gets to answer before the check gives up (and the caller is told to try again). */
const TIMEOUT_MS = 5000

export type StudioIdentity =
  /** Sanity accepted the token: who it belongs to and the roles they hold on this project today. */
  | { kind: 'verified'; id: string; user: RoleUser }
  /** Sanity refused the token (unknown, expired, revoked, or no access to this project). */
  | { kind: 'rejected' }
  /** Sanity could not be asked or did not answer sensibly. Never read as a yes. */
  | { kind: 'unavailable' }

/**
 * Asks Sanity who a Studio token belongs to: one `GET /users/me` on the project host, which answers
 * the user's id and their current roles on this project (README, "Publish gate", smoke test). The
 * token is sent only there, on every call, and nothing is cached, so a removed member or a revoked
 * token stops working at once. Never logs the token or the answer.
 */
export async function verifyStudioUser(token: string): Promise<StudioIdentity> {
  try {
    const response = await fetch(client.getUrl('/users/me'), {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.status === 401 || response.status === 403) return { kind: 'rejected' }
    if (!response.ok) return { kind: 'unavailable' }
    const me = (await response.json()) as { id?: unknown; roles?: unknown }
    if (typeof me.id !== 'string' || !me.id || !Array.isArray(me.roles)) {
      return { kind: 'unavailable' }
    }
    const roles = me.roles.flatMap((role: { name?: unknown } | null) =>
      typeof role?.name === 'string' ? [{ name: role.name }] : [],
    )
    return { kind: 'verified', id: me.id, user: { roles } }
  } catch {
    return { kind: 'unavailable' }
  }
}
