/**
 * Which document stands behind a URL path, and which field of it fixes what an audit finds. Pure:
 * the audit script reads the document (scripts/audit-page/sanity.mjs); this only says which one to
 * ask for and where its fields are.
 */
import { EVENTS_SEGMENT } from '@/config/event-paths'
import {
  BLOG_SEGMENT,
  HOME_SLUG,
  LOCATIONS_SEGMENT,
  SERVICES_SEGMENT,
  TEAM_SEGMENT,
} from '@/config/paths'
import { documentKey } from '@/lib/structured-data/ids'

import type { PageContent } from './types'

export interface DocumentCandidate {
  type: string
  slug: string
}

/** The detail routes: first path segment -> document type. A CMS page can't sit under these. */
const DETAIL_ROUTES: Record<string, string> = {
  [BLOG_SEGMENT]: 'post',
  [TEAM_SEGMENT]: 'teamMember',
  [SERVICES_SEGMENT]: 'service',
  [LOCATIONS_SEGMENT]: 'place',
  [EVENTS_SEGMENT]: 'event',
}

/**
 * The documents a path can be, most likely first. `/about` is the page with the slug `about`;
 * `/services/web` is the service `web`, or else a CMS page whose slug is `services/web` (a page may
 * sit under a segment while that feature is off); `/` is the page with the slug `home`.
 */
export function documentCandidates(pathname: string): DocumentCandidate[] {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  if (slug === '') return [{ type: 'page', slug: HOME_SLUG }]
  const [first = '', ...rest] = slug.split('/')
  const detail = DETAIL_ROUTES[first]
  const candidates: DocumentCandidate[] = []
  if (detail && rest.length === 1) candidates.push({ type: detail, slug: rest.join('/') })
  candidates.push({ type: 'page', slug })
  return candidates
}

/** The GROQ that reads the documents for a path; the params are the candidates' types and slugs. */
export const PAGE_CONTENT_QUERY = `*[_type in $types && slug.current in $slugs && !(_id match "drafts.*")]{
  "documentId": _id,
  "type": _type,
  "slug": slug.current,
  "seo": select(defined(seo) => seo{ metaTitle, metaDescription, noIndex }, null)
}`

/** The site-level read: the AI crawler switch and the business type. Both are singletons. */
export const SITE_CONTENT_QUERY = `{
  "allowAiCrawlers": *[_id == "siteIdentity"][0].allowAiCrawlers,
  "businessType": *[_id == "businessInfo"][0].businessType
}`

/** The query params for a path's candidates. */
export const contentParams = (candidates: readonly DocumentCandidate[]) => ({
  types: [...new Set(candidates.map(({ type }) => type))],
  slugs: [...new Set(candidates.map(({ slug }) => slug))],
})

/** The first candidate that one of the returned documents matches. */
export function pickDocument(
  candidates: readonly DocumentCandidate[],
  documents: readonly PageContent[],
): PageContent | null {
  for (const { type, slug } of candidates) {
    const found = documents.find((doc) => doc.type === type && doc.slug === slug)
    if (found) return found
  }
  return null
}

type MetaField = 'title' | 'description' | 'noIndex'

/**
 * The field each type's title, description and "hide from search engines" come from. Pages and
 * posts have an `seo` object whose title falls back to the document's title; the other types
 * use their own name and summary.
 */
const META_FIELDS: Record<string, Partial<Record<MetaField, string>>> = {
  page: { title: 'seo.metaTitle', description: 'seo.metaDescription', noIndex: 'seo.noIndex' },
  post: { title: 'seo.metaTitle', description: 'seo.metaDescription', noIndex: 'seo.noIndex' },
  service: { title: 'name', description: 'summary' },
  teamMember: { title: 'name', description: 'shortBio' },
  event: { title: 'title', description: 'summary' },
  place: { title: 'name', description: 'summary' },
}

/** Where the page's h1 comes from: a page's first section, otherwise the document's own title. */
const H1_FIELDS: Record<string, string> = {
  page: 'pageBuilder',
  post: 'title',
  service: 'name',
  teamMember: 'name',
  event: 'title',
  place: 'name',
}

/** Where a page's images are entered. Posts and pages hold them in their content. */
const IMAGE_FIELDS: Record<string, string> = {
  page: 'pageBuilder',
  post: 'body',
  service: 'image',
  teamMember: 'portrait',
  event: 'image',
}

/** The same `edit;id=…;type=…;path=…` intent string the Content health tool and rule F-8 use. */
export const studioIntent = (documentId: string, type: string, path?: string) =>
  `edit;id=${documentKey(documentId)};type=${type}${path ? `;path=${path}` : ''}`

export interface FieldTarget {
  documentId: string
  path: string
  studioIntent: string
}

const target = (content: PageContent | null, path: string | undefined): FieldTarget | null =>
  content && path
    ? {
        documentId: documentKey(content.documentId),
        path,
        studioIntent: studioIntent(content.documentId, content.type, path),
      }
    : null

/** The field that holds the page's title, description or noindex switch, or null when unknown. */
export const metaFieldTarget = (content: PageContent | null, field: MetaField) =>
  target(content, content ? META_FIELDS[content.type]?.[field] : undefined)

export const h1FieldTarget = (content: PageContent | null) =>
  target(content, content ? H1_FIELDS[content.type] : undefined)

export const imageFieldTarget = (content: PageContent | null) =>
  target(content, content ? IMAGE_FIELDS[content.type] : undefined)

/** `scope` and `fix` pieces for a finding about a field; without a document, the page alone. */
export function fieldScope(url: string, field: FieldTarget | null) {
  return field
    ? ({ kind: 'page', url, documentId: field.documentId, path: field.path } as const)
    : ({ kind: 'page', url } as const)
}
