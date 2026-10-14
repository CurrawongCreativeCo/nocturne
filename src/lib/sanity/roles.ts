import type { ConditionalPropertyCallback } from 'sanity'

/**
 * Who is using the Studio, from their Sanity project roles. Sanity enforces what each role may do
 * on the server; everything built on this file only decides what the Studio shows (see README,
 * "Studio roles and permissions"). It lives in src/lib so schema files can use the field callbacks
 * below; src/features/studio/roles.ts re-exports the predicates for Studio code.
 */

export interface RoleUser {
  roles?: readonly { name: string }[] | null
}

export type Audience = 'agency' | 'editor' | 'contributor'

/** Currawong staff. Clients must never hold either role. */
const AGENCY_ROLES = ['administrator', 'developer']

function hasRole(user: RoleUser | null | undefined, ...names: string[]): boolean {
  return Boolean(user?.roles?.some((role) => names.includes(role.name)))
}

/** Administrator or Developer on the project. Signed-out or role-less users are never agency. */
export function isAgency(user: RoleUser | null | undefined): boolean {
  return hasRole(user, ...AGENCY_ROLES)
}

/** Can only save drafts: has the Contributor role and nothing that lets them publish. */
export function isContributor(user: RoleUser | null | undefined): boolean {
  return hasRole(user, 'contributor') && !isAgency(user) && !hasRole(user, 'editor')
}

/** Everyone who is not agency staff: Editors, Contributors, Viewers and custom roles. */
export function isClientEditor(user: RoleUser | null | undefined): boolean {
  return !isAgency(user)
}

/** The view a user gets. `previewClientView` lets agency staff see the Editor's view. */
export function audienceFor(
  user: RoleUser | null | undefined,
  previewClientView = false,
): Audience {
  if (isAgency(user)) return previewClientView ? 'editor' : 'agency'
  return isContributor(user) ? 'contributor' : 'editor'
}

const PREVIEW_KEY = 'currawong:studio:client-view'
let previewCache: boolean | undefined

/** Whether agency staff chose to preview the client view (saved in this browser only). */
export function readClientViewPreview(): boolean {
  if (previewCache !== undefined) return previewCache
  try {
    previewCache = window.localStorage.getItem(PREVIEW_KEY) === '1'
  } catch {
    // Storage blocked or no window (server render): fall back to the agency view.
    previewCache = false
  }
  return previewCache
}

export function writeClientViewPreview(on: boolean): void {
  previewCache = on
  try {
    if (on) window.localStorage.setItem(PREVIEW_KEY, '1')
    else window.localStorage.removeItem(PREVIEW_KEY)
  } catch {
    // The preview then lasts until the page reloads, which is harmless.
  }
}

/** The audience for a user in this browser, including the saved client-view preview. */
export function currentAudience(user: RoleUser | null | undefined): Audience {
  return audienceFor(user, readClientViewPreview())
}

/** True when the Studio should show the simplified client view. */
export function isClientView(user: RoleUser | null | undefined): boolean {
  return currentAudience(user) !== 'agency'
}

/** Field `hidden` callback: agency staff see the field, everyone else does not. */
export const hiddenFromClients: ConditionalPropertyCallback = ({ currentUser }) =>
  isClientView(currentUser)

/** Field `readOnly` callback for slugs: clients can set a value once, then it is locked. */
export const lockedForClientsOnceSet: ConditionalPropertyCallback = ({ currentUser, value }) =>
  isClientView(currentUser) && hasSlugValue(value)

function hasSlugValue(value: unknown): boolean {
  return Boolean((value as { current?: string } | null | undefined)?.current)
}
