import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'
import { defineQuery } from 'next-sanity'

import { locationPath } from '@/config/paths'
import { hasLocations, isFeatureEnabled } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { imageFields, portableTextFields } from '@/lib/sanity/fragments'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

/**
 * A location with everything its page and metadata need, in one request: the fields, the services
 * offered there (the reverse of `service.locations`; a service with no locations is offered
 * everywhere, so it is listed too) and the team members who list it (the reverse of
 * `teamMember.locations`), so each relationship has one owning side. Only published locations have
 * a page; the slug is the way in.
 */
export const LOCATION_QUERY = defineQuery(/* groq */ `
  *[_type == "place" && slug.current == $slug][0] {
    _id,
    _type,
    _updatedAt,
    name,
    kind,
    "slug": slug.current,
    summary,
    image { ${imageFields} },
    body[] { ${portableTextFields} },
    phone,
    publicEmail,
    address { street, suburb, state, postcode },
    timeZone,
    geo { lat, lng },
    openingHours[] { _key, days, opens, closes, closed },
    specialHours[] { _key, date, closed, opens, closes, note },
    "services": *[_type == "service" && defined(slug.current)
      && (references(^._id) || count(coalesce(locations, [])) == 0)]
      | order(name asc) {
      _id,
      name,
      "slug": slug.current,
      summary
    },
    "people": *[_type == "teamMember" && references(^._id)]
      | order(coalesce(order, 999999) asc, name asc) {
      _id,
      name,
      role,
      "slug": slug.current
    }
  }
`)

/**
 * Every location, by name: static params, the unknown-URL check and the sitemap, all from one
 * cached result.
 */
export const LOCATION_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "place" && defined(slug.current)] | order(name asc) {
    "slug": slug.current,
    _updatedAt
  }
`)

/** The page lists services and team members, so those expire it too. */
const LOCATION_TAGS = [TAGS.place, TAGS.service, TAGS.teamMember]

/** `generateStaticParams` can't be empty under Cache Components; this slug is never a location (404). */
const PLACEHOLDER_SLUG = '_'

async function getLocationIndex() {
  if (!hasLocations()) return []
  const { data } = await cachedSanityFetch({
    query: LOCATION_INDEX_QUERY,
    ...PUBLISHED,
    tags: [TAGS.place],
  })
  return data
}

/**
 * Null for an unknown location, or when the site has no locations. Published reads check the cached
 * index first, so probing URLs (`/locations/anything`) costs neither a request nor a cache entry
 * each. Drafts skip the check so a location that isn't published yet can still be previewed.
 */
export async function getLocation({ slug, ...mode }: { slug: string } & FetchMode) {
  if (!hasLocations()) return null
  if (
    mode.perspective === 'published' &&
    !(await getLocationIndex()).some((location) => location.slug === slug)
  ) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: LOCATION_QUERY,
    params: { slug },
    ...mode,
    tags: LOCATION_TAGS,
  })
  if (!data?.slug) return null
  // Services and people are only shown while their features are on.
  return {
    ...data,
    slug: data.slug,
    services: isFeatureEnabled('services') ? data.services : [],
    people: isFeatureEnabled('team') ? data.people : [],
  }
}

/**
 * Always published SEO data, like `getServiceMetadata`: it stays prerenderable and drafts don't leak
 * into <head>. Reuses the published location's cache entry. `parent` is the site-level metadata; a
 * location's `openGraph` replaces the parent's, so the site name is carried over.
 */
export async function getLocationMetadata(
  slug: string,
  parent: ResolvedMetadata,
): Promise<Metadata> {
  const location = await getLocation({ slug, ...PUBLISHED })
  if (!location) return { title: 'Location not found' }

  const title = location.name
  const description = location.summary ?? undefined
  const path = locationPath(location.slug)
  const { image } = location
  const shareImage = image?.asset
    ? urlFor({
        asset: { _ref: image.asset._id },
        crop: image.crop ?? undefined,
        hotspot: image.hotspot ?? undefined,
      })
        .width(1200)
        .height(630)
        .fit('crop')
        .url()
    : undefined

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: parent.openGraph?.siteName,
      title,
      description,
      url: path,
      images: shareImage
        ? [{ url: shareImage, width: 1200, height: 630, alt: image?.alt ?? location.name }]
        : parent.openGraph?.images,
    },
  }
}

/** Route params for `generateStaticParams`. */
export async function getLocationStaticParams() {
  const locations = await getLocationIndex()
  return locations.length > 0
    ? locations.map(({ slug }) => ({ slug }))
    : [{ slug: PLACEHOLDER_SLUG }]
}

/** How many location pages there are, for sizing the sitemap. Free: it is the cached index. */
export async function getLocationCount() {
  return (await getLocationIndex()).length
}

/** Sitemap entries for locations `start` up to (not including) `end` of the name-ordered index. */
export async function getLocationSitemap(range: {
  start: number
  end: number
}): Promise<MetadataRoute.Sitemap> {
  if (range.start >= range.end) return []
  return (await getLocationIndex()).slice(range.start, range.end).map(({ slug, _updatedAt }) => ({
    url: new URL(locationPath(slug), siteUrl).toString(),
    lastModified: new Date(_updatedAt),
  }))
}
