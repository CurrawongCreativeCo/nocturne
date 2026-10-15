import { resolveVersions } from '../../content-health/utils/detect'
import type { Audience } from '../../roles'

/** Document types a client can open from their sidebar. Agency staff see every type. */
export const CLIENT_VISIBLE_TYPES: ReadonlySet<string> = new Set([
  'page',
  'post',
  'author',
  'category',
  'siteIdentity',
  'siteNavigation',
  'announcement',
  'businessInfo',
  'teamMember',
])

export const RECENT_LIMIT = 8

export interface ChangedDocument {
  _id: string
  _type: string
  _updatedAt: string
  title: string | null
}

export interface RecentChange {
  /** The published id, which is what the edit intent expects. */
  id: string
  type: string
  title: string | null
  updatedAt: string
  /** The newest version is an unpublished draft. */
  isDraft: boolean
}

/** Whether Start here should mention a document of this type to this audience. */
export function isTypeShown(
  type: string,
  audience: Audience,
  isFeatureType: (type: string) => boolean,
): boolean {
  if (!isFeatureType(type)) return false
  return audience === 'agency' || CLIENT_VISIBLE_TYPES.has(type)
}

/**
 * The newest documents, one row each (a draft and its published copy count once, the draft
 * winning because it is what the editor last touched), newest first.
 */
export function buildRecentChanges(
  rows: readonly ChangedDocument[],
  shown: (type: string) => boolean,
  limit: number = RECENT_LIMIT,
): RecentChange[] {
  return resolveVersions(rows.filter((row) => shown(row._type)))
    .map(({ id, doc }) => ({
      id,
      type: doc._type,
      title: doc.title,
      updatedAt: doc._updatedAt,
      isDraft: doc._id.startsWith('drafts.'),
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}
