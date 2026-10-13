import type { Metadata, MetadataRoute, ResolvedMetadata } from 'next'

import { slugToPath, slugToSegments } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { findRedirect } from '@/lib/redirects'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

import {
  PAGE_COUNT_QUERY,
  PAGE_INDEX_QUERY,
  PAGE_QUERY,
  PAGE_SITEMAP_QUERY,
  REDIRECTS_QUERY,
} from './queries'
import { buildBreadcrumbs } from '../utils/breadcrumbs'
import { sitemapChunkCount, sitemapChunkRange } from '../utils/sitemap-chunks'

/**
 * Same cached fetch in both modes; `mode` (perspective, stega) is part of the cache key.
 * Always call it with the same argument shape so the page and its metadata hit one entry.
 */
export async function getPage({ slug, ...mode }: { slug: string } & FetchMode) {
  // Unknown URLs (typos, bots probing /wp-admin) are answered from the cached page index
  // instead of costing a request and a cache entry each. Drafts skip this so unpublished
  // pages can still be previewed.
  if (
    mode.perspective === 'published' &&
    !(await getPageIndex()).some((page) => page.slug === slug)
  ) {
    return null
  }
  const { data } = await cachedSanityFetch({
    query: PAGE_QUERY,
    params: { slug },
    ...mode,
    tags: [TAGS.page, TAGS.sharedSection],
  })
  return data
}

/**
 * Always published SEO data: metadata must stay prerenderable, and drafts shouldn't leak into <head>.
 * Reuses the published page entry, so it costs no extra request.
 *
 * `parent` is the site-level metadata. A page's `openGraph` replaces the parent's entirely, so the
 * site name, default share image and description fallback are carried over explicitly.
 */
export async function getPageMetadata(slug: string, parent: ResolvedMetadata): Promise<Metadata> {
  const page = await getPage({ slug, ...PUBLISHED })
  // Unknown URLs render the 404 page through this route, so its title is set here.
  if (!page) return { title: 'Page not found' }

  const { seo } = page
  const ogImage = seo?.ogImage?.asset
    ? urlFor({ asset: { _ref: seo.ogImage.asset._id } })
        .width(1200)
        .height(630)
        .fit('crop')
        .url()
    : undefined

  const title = seo?.metaTitle || page.title
  const description = seo?.metaDescription ?? parent.description ?? undefined
  const path = slugToPath(slug)
  // One og:image: the page's own, else the site's default, else the generated one (/api/og).
  const images = ogImage
    ? [{ url: ogImage, width: 1200, height: 630 }]
    : parent.openGraph?.images?.length
      ? parent.openGraph.images
      : [{ url: generatedOgImagePath(slug), width: 1200, height: 630, alt: title }]

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
      images,
    },
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
  }
}

/** The generated share image for a page (src/app/api/og). */
function generatedOgImagePath(slug: string) {
  return ['/api/og', ...slugToSegments(slug)].join('/')
}

async function getPageIndex() {
  const { data } = await cachedSanityFetch({
    query: PAGE_INDEX_QUERY,
    ...PUBLISHED,
    tags: [TAGS.page],
  })
  return data
}

/** Breadcrumb trail for a nested page, from the cached page index: no extra request. */
export async function getBreadcrumbs(slug: string) {
  return buildBreadcrumbs(slug, await getPageIndex())
}

/** Route params for `generateStaticParams`. */
export async function getPageStaticParams() {
  const params = (await getPageIndex()).map(({ slug }) => ({ slug: slugToSegments(slug) }))
  // Cache Components fails the build on an empty list; "/" always exists as a route.
  return params.some((p) => p.slug.length === 0) ? params : [{ slug: [] }, ...params]
}

/** Number of sitemap files; 1 until the site passes the per-file URL limit. */
export async function getSitemapCount() {
  const { data } = await cachedSanityFetch({
    query: PAGE_COUNT_QUERY,
    ...PUBLISHED,
    tags: [TAGS.page],
  })
  return sitemapChunkCount(data)
}

/** Entries for sitemap file `id`. A single-file site reuses the cached page index. */
export async function getSitemap(id: number): Promise<MetadataRoute.Sitemap> {
  const pages =
    (await getSitemapCount()) === 1
      ? await getPageIndex()
      : (
          await cachedSanityFetch({
            query: PAGE_SITEMAP_QUERY,
            params: sitemapChunkRange(id),
            ...PUBLISHED,
            tags: [TAGS.page],
          })
        ).data
  return pages
    .filter(({ noIndex }) => !noIndex)
    .map(({ slug, _updatedAt }) => ({
      url: new URL(slugToPath(slug), siteUrl).toString(),
      lastModified: new Date(_updatedAt),
    }))
}

/**
 * Redirect for a path that matched no page, from one cached list of all redirects. Only
 * reached on a miss, so normal page views never read it.
 */
export async function getRedirect(path: string) {
  return findRedirect(await getRedirects(), path)
}

/** All published redirects: PageView's fallback and the Edge Config sync share this one cache entry. */
export async function getRedirects() {
  const { data } = await cachedSanityFetch({
    query: REDIRECTS_QUERY,
    ...PUBLISHED,
    tags: [TAGS.redirect],
  })
  return data
}
