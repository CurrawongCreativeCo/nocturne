/**
 * Every JSON-LD `@id`, from one place (E2 §3.2). Persistent entities are keyed by the published
 * document `_id`, so they keep their `@id` when a slug changes; nodes that describe a URL are keyed
 * by that URL. `origin` is the production origin (`siteUrl`), never a preview host. A test fails
 * if these shapes are built anywhere else in `src/`.
 */

/** The published `_id`: `drafts.` and release-version (`versions.<release>.`) prefixes removed. */
export function documentKey(id: string): string {
  return id.replace(/^versions\.[^.]+\./, '').replace(/^drafts\./, '')
}

const base = (origin: string) => origin.replace(/\/+$/, '')

export const organizationId = (origin: string) => `${base(origin)}/#organization`
export const websiteId = (origin: string) => `${base(origin)}/#website`

export const serviceId = (origin: string, id: string) =>
  `${base(origin)}/#service-${documentKey(id)}`
export const locationId = (origin: string, id: string) =>
  `${base(origin)}/#location-${documentKey(id)}`
export const personId = (origin: string, id: string) => `${base(origin)}/#person-${documentKey(id)}`
export const eventId = (origin: string, id: string) => `${base(origin)}/#event-${documentKey(id)}`
export const articleId = (origin: string, id: string) =>
  `${base(origin)}/#article-${documentKey(id)}`

/** `pageUrl` is the page's absolute URL, as `new URL(path, siteUrl).toString()` gives it. */
export const webPageId = (pageUrl: string) => `${pageUrl}#webpage`
export const breadcrumbId = (pageUrl: string) => `${pageUrl}#breadcrumb`
export const faqId = (pageUrl: string) => `${pageUrl}#faq`
