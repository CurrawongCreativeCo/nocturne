import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'
import { defineQuery } from 'next-sanity'

import { eventPath } from '@/config/event-paths'
import { hasEvents } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import {
  eventCardFields,
  eventLastRelevant,
  linkFields,
  portableTextFields,
} from '@/lib/sanity/fragments'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

/**
 * An event with everything its page, calendar file and metadata need. Only published events with a
 * slug have a page; the slug is the only way in. `businessTimeZone` is the fallback for an event
 * saved without a zone (an all-day event), so the page needs no second request.
 */
export const EVENT_QUERY = defineQuery(/* groq */ `
  *[_type == "event" && slug.current == $slug][0] {
    ${eventCardFields},
    _type,
    _updatedAt,
    body[] { ${portableTextFields} },
    location { kind, name, address, url },
    registration { label, variant, link { ${linkFields} } },
    "businessTimeZone": *[_id == "businessInfo"][0].timeZone
  }
`)

/**
 * Every event that has a page, soonest first: static params, the unknown-URL check and the
 * sitemap, all from one cached result.
 */
export const EVENTS_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "event" && defined(slug.current)] | order(start asc) {
    "slug": slug.current,
    _updatedAt
  }
`)

/**
 * Every event, for the calendar feed. The feed keeps the ones still to come when it is asked
 * (the clock can't be read here: this result is cached). Capped at 500, ordered by the last moment
 * an event can matter (`eventLastRelevant`), so a long history can never crowd out what is coming.
 */
export const EVENTS_FEED_QUERY = defineQuery(/* groq */ `
  {
    "events": *[_type == "event" && defined(slug.current) && defined(start)]
      | order(${eventLastRelevant} desc) [0...500] {
      _id,
      _updatedAt,
      "slug": slug.current,
      title,
      start,
      end,
      allDay,
      timeZone,
      summary,
      status,
      "category": category->title,
      location { kind, name, address, url },
      recurrence { repeat, until, skip }
    },
    "businessTimeZone": *[_id == "businessInfo"][0].timeZone
  }
`)

/** An event page links to pages from its description and its button, and shows its category. */
const EVENT_TAGS = [TAGS.event, TAGS.eventCategory, TAGS.page, TAGS.businessInfo]

/** `generateStaticParams` can't be empty under Cache Components; this slug is never an event (404). */
const PLACEHOLDER_SLUG = '_'

async function getEventsIndex() {
  if (!hasEvents()) return []
  const { data } = await cachedSanityFetch({
    query: EVENTS_INDEX_QUERY,
    ...PUBLISHED,
    tags: [TAGS.event],
  })
  return data
}

/**
 * Null for an unknown event, or when the site has no events. Published reads check the cached
 * index first, so probing URLs (`/events/anything`) costs neither a request nor a cache entry
 * each. Drafts skip the check so an event that isn't published yet can still be previewed.
 */
export async function getEvent({ slug, ...mode }: { slug: string } & FetchMode) {
  if (!hasEvents()) return null
  if (mode.perspective === 'published' && !(await getEventsIndex()).some((e) => e.slug === slug)) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: EVENT_QUERY,
    params: { slug },
    ...mode,
    tags: EVENT_TAGS,
  })
  // The query matches on the slug, so it is set; this tells the types so.
  return data?.slug ? { ...data, slug: data.slug } : null
}

/** Every event for the calendar feed (published only). Empty when the site has no events. */
export async function getEventsFeed() {
  if (!hasEvents()) return null
  const { data } = await cachedSanityFetch({
    query: EVENTS_FEED_QUERY,
    ...PUBLISHED,
    tags: EVENT_TAGS,
  })
  return data
}

/**
 * Always published SEO data, like `getPostMetadata`: it stays prerenderable and drafts don't leak
 * into <head>. Reuses the published event's cache entry. `parent` is the site-level metadata; an
 * event's `openGraph` replaces the parent's, so the site name is carried over. The share image is
 * the generated card (src/app/api/og/events), which carries the date.
 */
export async function getEventMetadata(slug: string, parent: ResolvedMetadata): Promise<Metadata> {
  const event = await getEvent({ slug, ...PUBLISHED })
  if (!event) return { title: 'Event not found' }

  const description = event.summary ?? parent.description ?? undefined
  const path = eventPath(event.slug)
  const image = `/api/og/events/${event.slug}`

  return {
    title: event.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: parent.openGraph?.siteName,
      title: event.title,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: event.title }],
    },
  }
}

/** Route params for `generateStaticParams`. */
export async function getEventStaticParams() {
  const events = await getEventsIndex()
  return events.length > 0 ? events.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }]
}

/** How many event pages there are, for sizing the sitemap. Free: it is the cached index. */
export async function getEventCount() {
  return (await getEventsIndex()).length
}

/** Sitemap entries for events `start` up to (not including) `end` of the index. */
export async function getEventSitemap(range: {
  start: number
  end: number
}): Promise<MetadataRoute.Sitemap> {
  if (range.start >= range.end) return []
  return (await getEventsIndex()).slice(range.start, range.end).map(({ slug, _updatedAt }) => ({
    url: new URL(eventPath(slug), siteUrl).toString(),
    lastModified: new Date(_updatedAt),
  }))
}
