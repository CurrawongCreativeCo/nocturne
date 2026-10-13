import { stegaClean } from 'next-sanity'

/** Values of the `access` field on pages and sections (see schema/access-field.ts). */
export const ACCESS_PUBLIC = 'public'
export const ACCESS_MEMBERS = 'members'

/** Whether a page or section is members-only. Missing means public, so old content needs no migration. */
export function isMembersOnly(access: string | null | undefined): boolean {
  return stegaClean(access) === ACCESS_MEMBERS
}
