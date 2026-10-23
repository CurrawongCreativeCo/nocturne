import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'
import { defineQuery } from 'next-sanity'

import { teamPath } from '@/config/paths'
import { hasTeamProfiles } from '@/config/profile'
import { siteUrl } from '@/config/site-url'
import { imageFields, portableTextFields } from '@/lib/sanity/fragments'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

/**
 * A member with everything their page and metadata need. Only published members with a slug have
 * a page; the slug is the only way in.
 */
export const TEAM_MEMBER_QUERY = defineQuery(/* groq */ `
  *[_type == "teamMember" && slug.current == $slug][0] {
    _id,
    _type,
    _updatedAt,
    name,
    role,
    "slug": slug.current,
    portrait { ${imageFields} },
    shortBio,
    bio[] { ${portableTextFields} },
    qualifications,
    publicEmail,
    phone,
    socialLinks[] { _key, platform, url },
    socialDisplay
  }
`)

/**
 * Every member who has a page, in team order: static params, the unknown-URL check and the
 * sitemap, all from one cached result.
 */
export const TEAM_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "teamMember" && defined(slug.current)]
    | order(coalesce(order, 999999) asc, name asc) {
    "slug": slug.current,
    _updatedAt
  }
`)

/** Profile pages link to pages from their bio, which resolve to slugs. */
const MEMBER_TAGS = [TAGS.teamMember, TAGS.page]

/** `generateStaticParams` can't be empty under Cache Components; this slug is never a member (404). */
const PLACEHOLDER_SLUG = '_'

async function getTeamIndex() {
  if (!hasTeamProfiles()) return []
  const { data } = await cachedSanityFetch({
    query: TEAM_INDEX_QUERY,
    ...PUBLISHED,
    tags: [TAGS.teamMember],
  })
  return data
}

/**
 * Null for an unknown member, or when the site has no profile pages. Published reads check the
 * cached index first, so probing URLs (`/team/anything`) costs neither a request nor a cache
 * entry each. Drafts skip the check so a member who isn't published yet can still be previewed.
 */
export async function getTeamMember({ slug, ...mode }: { slug: string } & FetchMode) {
  if (!hasTeamProfiles()) return null
  if (mode.perspective === 'published' && !(await getTeamIndex()).some((m) => m.slug === slug)) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: TEAM_MEMBER_QUERY,
    params: { slug },
    ...mode,
    tags: MEMBER_TAGS,
  })
  // The query matches on the slug, so it is set; this tells the types so.
  return data?.slug ? { ...data, slug: data.slug } : null
}

/**
 * Always published SEO data, like `getPostMetadata`: it stays prerenderable and drafts don't leak
 * into <head>. Reuses the published member's cache entry. `parent` is the site-level metadata; a
 * member's `openGraph` replaces the parent's, so the site name is carried over.
 */
export async function getTeamMemberMetadata(
  slug: string,
  parent: ResolvedMetadata,
): Promise<Metadata> {
  const member = await getTeamMember({ slug, ...PUBLISHED })
  if (!member) return { title: 'Team member not found' }

  const title = member.role ? `${member.name}, ${member.role}` : member.name
  const description = member.shortBio ?? undefined
  const path = teamPath(member.slug)
  const { portrait } = member
  const image = portrait.asset
    ? urlFor({
        asset: { _ref: portrait.asset._id },
        crop: portrait.crop ?? undefined,
        hotspot: portrait.hotspot ?? undefined,
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
      type: 'profile',
      siteName: parent.openGraph?.siteName,
      title,
      description,
      url: path,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: portrait.alt ?? member.name }]
        : parent.openGraph?.images,
    },
  }
}

/** Route params for `generateStaticParams`. */
export async function getTeamStaticParams() {
  const members = await getTeamIndex()
  return members.length > 0 ? members.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }]
}

/** How many profile pages there are, for sizing the sitemap. Free: it is the cached index. */
export async function getTeamCount() {
  return (await getTeamIndex()).length
}

/** Sitemap entries for profiles `start` up to (not including) `end` of the team-ordered index. */
export async function getTeamSitemap(range: {
  start: number
  end: number
}): Promise<MetadataRoute.Sitemap> {
  if (range.start >= range.end) return []
  return (await getTeamIndex()).slice(range.start, range.end).map(({ slug, _updatedAt }) => ({
    url: new URL(teamPath(slug), siteUrl).toString(),
    lastModified: new Date(_updatedAt),
  }))
}
