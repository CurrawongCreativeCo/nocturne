/**
 * The launch checklist and the pages a pre-launch site shows, as pure functions over the raw
 * query result (drafts beside published documents, see `api/launch-query.ts`), so they test
 * without a Studio. A "done" item always means the published version, because that is what
 * visitors get. Nothing here is stored anywhere: it is recomputed from the content.
 */
import { HOME_SLUG, slugToPath } from '@/config/paths'

import { findBrokenLinkTargets, resolveVersions } from '../../content-health/utils/detect'

export interface LaunchPageDoc {
  _id: string
  title?: string | null
  slug?: string | null
  /** The page's own meta description. */
  description?: string | null
  /** Asset id of the page's own share image. */
  ogImage?: string | null
  pageBuilder?: unknown
}

export interface LaunchData {
  pages: LaunchPageDoc[]
  navigation: { _id: string; headerNav?: unknown; headerCta?: unknown; footerNav?: unknown }[]
  identity: {
    _id: string
    description?: string | null
    ogImage?: string | null
    browserIcon?: { choice?: string | null; image?: string | null } | null
    logo?: string | null
  }[]
  business: {
    _id: string
    phone?: string | null
    publicEmail?: string | null
    socialCount?: number | null
  }[]
}

export interface ChecklistFix {
  intent: 'create' | 'edit'
  type: string
  id?: string
}

export interface ChecklistItem {
  id:
    | 'home-page'
    | 'temporary-page'
    | 'share-image'
    | 'menus-published'
    | 'menu-links'
    | 'browser-icon'
    | 'contact'
    | 'social'
    | 'temporary-note'
  label: string
  /** `reminder` is something to remember at launch, not a fault. */
  status: 'done' | 'todo' | 'reminder'
  detail?: string
  fix?: ChecklistFix
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Every span's text inside Portable Text (or any nested value), joined. */
export function portableTextOf(value: unknown): string {
  if (Array.isArray(value)) return value.map(portableTextOf).join(' ')
  if (!isRecord(value)) return ''
  if (value._type === 'span' && typeof value.text === 'string') return value.text
  return Object.values(value).map(portableTextOf).join(' ')
}

/** Wording the pre-launch templates seed, which an editor removes at launch. */
const NOTE_PATTERN = /new website is on its way|coming soon|under construction|Replace:/i

const versions = (data: LaunchData) => resolveVersions(data.pages)

/** Whether any section of the page is a Link list. */
export function hasLinkList(pageBuilder: unknown): boolean {
  return (
    Array.isArray(pageBuilder) &&
    pageBuilder.some((section) => isRecord(section) && section._type === 'linkList')
  )
}

/**
 * The page "Your links" opens: a published page with a Link list, preferring the pre-launch
 * homepage, then the page called `links`, then the first. Null when no page uses one.
 */
export function findLinkListPage<T extends { id: string; doc: LaunchPageDoc; published: boolean }>(
  pages: readonly T[],
  homepage?: string,
): T | null {
  const candidates = pages.filter(({ published, doc }) => published && hasLinkList(doc.pageBuilder))
  const preferred = [homepage, 'links'].filter((slug): slug is string => Boolean(slug))
  for (const slug of preferred) {
    const match = candidates.find(({ doc }) => doc.slug === slug)
    if (match) return match
  }
  return candidates[0] ?? null
}

export interface PublicPageRow {
  slug: string
  title: string
  /** The page's id when it is published, else null: there is nothing to open. */
  id: string | null
  /** Its public path, e.g. "/links". */
  path: string
}

/** The pages a visitor can open before launch, in the profile's order, whether or not they are published yet. */
export function publicPageRows(data: LaunchData, visibleSlugs: readonly string[]): PublicPageRow[] {
  const published = versions(data).filter((page) => page.published)
  return visibleSlugs.map((slug) => {
    const page = published.find(({ doc }) => doc.slug === slug)
    return {
      slug,
      title: page?.doc.title?.trim() || slug,
      id: page?.id ?? null,
      path: slugToPath(slug),
    }
  })
}

/**
 * The launch checklist. `homepage` is the pre-launch homepage slug (the temporary page). Items are
 * `done`, `todo` or (the leftover note) `reminder`.
 */
export function evaluateChecklist(data: LaunchData, homepage: string): ChecklistItem[] {
  const pages = versions(data)
  const publishedPages = pages.filter(({ published }) => published)
  const publishedIds = new Set(publishedPages.map(({ id }) => id))
  const bySlug = (slug: string) => publishedPages.find(({ doc }) => doc.slug === slug)
  const identity = resolveVersions(data.identity)[0]
  const navigation = resolveVersions(data.navigation)[0]
  const business = resolveVersions(data.business)[0]

  const items: ChecklistItem[] = []

  const home = bySlug(HOME_SLUG)
  items.push({
    id: 'home-page',
    label: 'The home page is published',
    status: home ? 'done' : 'todo',
    detail: home ? undefined : 'Visitors get this page when the full site launches.',
    fix: home ? undefined : { intent: 'create', type: 'page' },
  })

  const temporary = bySlug(homepage)
  items.push({
    id: 'temporary-page',
    label: 'The temporary page is published',
    status: temporary ? 'done' : 'todo',
    detail: temporary
      ? undefined
      : `Nothing is published at “${homepage}”, so visitors see a 404 page.`,
    fix: temporary ? undefined : { intent: 'create', type: 'page' },
  })

  if (temporary) {
    // The site-level values are the fallbacks the page uses, so they count.
    const hasImage = Boolean(temporary.doc.ogImage ?? identity?.doc.ogImage)
    const hasDescription = Boolean((temporary.doc.description ?? identity?.doc.description)?.trim())
    const missing = [!hasImage && 'a share image', !hasDescription && 'a description'].filter(
      Boolean,
    )
    items.push({
      id: 'share-image',
      label: 'The temporary page has a share image and description',
      status: missing.length === 0 ? 'done' : 'todo',
      detail:
        missing.length === 0
          ? undefined
          : `Add ${missing.join(' and ')} (on the page’s Search & sharing tab, or as the site default). They show when someone shares the link.`,
      fix: missing.length === 0 ? undefined : { intent: 'edit', type: 'page', id: temporary.id },
    })
  }

  const navigationPublished = navigation?.published === true
  items.push({
    id: 'menus-published',
    label: 'The header and footer menus are published',
    status: navigationPublished ? 'done' : 'todo',
    detail: navigationPublished ? undefined : 'Publish Navigation, or the full site has no menu.',
    fix: navigationPublished
      ? undefined
      : { intent: 'edit', type: 'siteNavigation', id: 'siteNavigation' },
  })
  if (navigation) {
    const broken = findBrokenLinkTargets(
      [navigation.doc.headerNav, navigation.doc.headerCta, navigation.doc.footerNav],
      publishedIds,
    )
    items.push({
      id: 'menu-links',
      label: 'No menu link goes to an unpublished page',
      status: broken.length === 0 ? 'done' : 'todo',
      detail:
        broken.length === 0
          ? undefined
          : `${broken.length === 1 ? 'A menu link points' : `${String(broken.length)} menu links point`} to a page that is not published.`,
      fix:
        broken.length === 0
          ? undefined
          : { intent: 'edit', type: 'siteNavigation', id: 'siteNavigation' },
    })
  }

  const icon = identity?.published ? identity.doc.browserIcon : null
  const hasOwnIcon =
    (icon?.choice === 'upload' && Boolean(icon.image)) ||
    (icon?.choice === 'logo' && Boolean(identity?.doc.logo))
  items.push({
    id: 'browser-icon',
    label: 'The browser icon is the client’s, not the default',
    status: hasOwnIcon ? 'done' : 'todo',
    detail: hasOwnIcon ? undefined : 'Upload one, or use the logo, in Name, logo & icon.',
    fix: hasOwnIcon ? undefined : { intent: 'edit', type: 'siteIdentity', id: 'siteIdentity' },
  })

  const info = business?.published ? business.doc : null
  const hasContact = Boolean(info?.phone?.trim() || info?.publicEmail?.trim())
  items.push({
    id: 'contact',
    label: 'Business info has a phone number or email',
    status: hasContact ? 'done' : 'todo',
    fix: hasContact ? undefined : { intent: 'edit', type: 'businessInfo', id: 'businessInfo' },
  })
  const hasSocial = (info?.socialCount ?? 0) > 0
  items.push({
    id: 'social',
    label: 'Business info has social links',
    status: hasSocial ? 'done' : 'todo',
    fix: hasSocial ? undefined : { intent: 'edit', type: 'businessInfo', id: 'businessInfo' },
  })

  // A reminder, never a failure: it only says what to delete at launch, if it is still there.
  if (temporary && NOTE_PATTERN.test(portableTextOf(temporary.doc.pageBuilder))) {
    items.push({
      id: 'temporary-note',
      label: 'The temporary page still has a coming-soon note',
      status: 'reminder',
      detail: 'Remove it, or the page, when the full site launches.',
      fix: { intent: 'edit', type: 'page', id: temporary.id },
    })
  }
  return items
}

/** "6 of 8 done": reminders are not counted either way. */
export function checklistProgress(items: readonly ChecklistItem[]) {
  const counted = items.filter(({ status }) => status !== 'reminder')
  return { done: counted.filter(({ status }) => status === 'done').length, total: counted.length }
}
