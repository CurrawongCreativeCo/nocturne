import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'
import { defineQuery } from 'next-sanity'

import { servicePath } from '@/config/paths'
import { hasServices } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { imageFields, linkFields, portableTextFields } from '@/lib/sanity/fragments'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

/**
 * A service with everything its page and metadata need, in one request: the fields, the proof of
 * work it links to, the team members who list it (the reverse of `teamMember.services`) and the
 * newest posts that list it (the reverse of `post.services`), so each relationship has one owning side. Only published services have a page; the slug is the way in.
 * Members-only pages are left out of the proof of work, as they are from the sitemap and search.
 */
export const SERVICE_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && slug.current == $slug][0] {
    _id,
    _type,
    _updatedAt,
    name,
    "slug": slug.current,
    summary,
    image { ${imageFields} },
    body[] { ${portableTextFields} },
    audience,
    priceFrom,
    priceUnit,
    faqs[] { _key, question, answer },
    "hasSections": count(sections[access != "members"]) > 0,
    "hasFaqSections": count(sections[_type == "faq" && access != "members" && count(items) > 0]) > 0,
    enquiry { label, variant, link { ${linkFields} } },
    evidence[]->[defined(slug.current) && access != "members"] { _id, _type, title, "slug": slug.current },
    "people": *[_type == "teamMember" && references(^._id)]
      | order(coalesce(order, 999999) asc, name asc) {
      _id,
      name,
      role,
      "slug": slug.current
    },
    "articles": *[_type == "post" && defined(slug.current) && references(^._id)]
      | order(publishedAt desc, _id desc) [0...6] {
      _id,
      title,
      "slug": slug.current
    }
  }
`)

/**
 * Every service, by name: static params, the unknown-URL check and the sitemap, all from one cached
 * result.
 */
export const SERVICE_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && defined(slug.current)] | order(name asc) {
    "slug": slug.current,
    _updatedAt
  }
`)

/** The page links to posts and pages (proof of work) and lists team members, so those expire it too. */
const SERVICE_TAGS = [TAGS.service, TAGS.teamMember, TAGS.post, TAGS.page]

/** `generateStaticParams` can't be empty under Cache Components; this slug is never a service (404). */
const PLACEHOLDER_SLUG = '_'

async function getServiceIndex() {
  if (!hasServices()) return []
  const { data } = await cachedSanityFetch({
    query: SERVICE_INDEX_QUERY,
    ...PUBLISHED,
    tags: [TAGS.service],
  })
  return data
}

/**
 * Null for an unknown service, or when the site has no services. Published reads check the cached
 * index first, so probing URLs (`/services/anything`) costs neither a request nor a cache entry
 * each. Drafts skip the check so a service that isn't published yet can still be previewed.
 */
export async function getService({ slug, ...mode }: { slug: string } & FetchMode) {
  if (!hasServices()) return null
  if (mode.perspective === 'published' && !(await getServiceIndex()).some((s) => s.slug === slug)) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: SERVICE_QUERY,
    params: { slug },
    ...mode,
    tags: SERVICE_TAGS,
  })
  // The query matches on the slug, so it is set; this tells the types so.
  return data?.slug ? { ...data, slug: data.slug } : null
}

/**
 * Always published SEO data, like `getPostMetadata`: it stays prerenderable and drafts don't leak
 * into <head>. Reuses the published service's cache entry. `parent` is the site-level metadata; a
 * service's `openGraph` replaces the parent's, so the site name is carried over.
 */
export async function getServiceMetadata(
  slug: string,
  parent: ResolvedMetadata,
): Promise<Metadata> {
  const service = await getService({ slug, ...PUBLISHED })
  if (!service) return { title: 'Service not found' }

  const title = service.name
  const description = service.summary
  const path = servicePath(service.slug)
  const { image } = service
  const shareImage = image.asset
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
        ? [{ url: shareImage, width: 1200, height: 630, alt: image.alt ?? service.name }]
        : parent.openGraph?.images,
    },
  }
}

/** Route params for `generateStaticParams`. */
export async function getServiceStaticParams() {
  const services = await getServiceIndex()
  return services.length > 0 ? services.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }]
}

/** How many service pages there are, for sizing the sitemap. Free: it is the cached index. */
export async function getServiceCount() {
  return (await getServiceIndex()).length
}

/** Sitemap entries for services `start` up to (not including) `end` of the name-ordered index. */
export async function getServiceSitemap(range: {
  start: number
  end: number
}): Promise<MetadataRoute.Sitemap> {
  if (range.start >= range.end) return []
  return (await getServiceIndex()).slice(range.start, range.end).map(({ slug, _updatedAt }) => ({
    url: new URL(servicePath(slug), siteUrl).toString(),
    lastModified: new Date(_updatedAt),
  }))
}
