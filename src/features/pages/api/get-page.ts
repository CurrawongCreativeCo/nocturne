import type { Metadata, MetadataRoute } from 'next'

import { siteUrl } from '@/config/env'
import { slugToPath, slugToSegments } from '@/config/paths'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, type FetchMode } from '@/lib/sanity/live'

import { PAGE_INDEX_QUERY, PAGE_QUERY } from './queries'

/**
 * Same cached fetch in both modes; `mode` (perspective, stega) is part of the cache key.
 * Always call it with the same argument shape so the page and its metadata hit one entry.
 */
export async function getPage({ slug, ...mode }: { slug: string } & FetchMode) {
  // Unknown URLs (typos, bots probing /wp-admin) are answered from the cached page index
  // instead of costing a request and a cache entry each. Drafts skip this so unpublished
  // pages can still be previewed.
  if (mode.perspective === 'published' && !(await getPageIndex()).some((page) => page.slug === slug)) {
    return null
  }
  const { data } = await cachedSanityFetch({ query: PAGE_QUERY, params: { slug }, ...mode })
  return data
}

/**
 * Always published SEO data: metadata must stay prerenderable, and drafts shouldn't leak into <head>.
 * Reuses the published page entry, so it costs no extra request.
 */
export async function getPageMetadata(slug: string): Promise<Metadata> {
  const page = await getPage({ slug, ...PUBLISHED })
  if (!page) return {}

  const { seo } = page
  const ogImage = seo?.ogImage?.asset
    ? urlFor({ asset: { _ref: seo.ogImage.asset._id } }).width(1200).height(630).fit('crop').url()
    : undefined

  return {
    title: seo?.metaTitle || page.title,
    description: seo?.metaDescription ?? undefined,
    alternates: { canonical: slugToPath(slug) },
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
  }
}

async function getPageIndex() {
  const { data } = await cachedSanityFetch({ query: PAGE_INDEX_QUERY, ...PUBLISHED })
  return data
}

/** Route params for `generateStaticParams`. */
export async function getPageStaticParams() {
  const params = (await getPageIndex()).map(({ slug }) => ({ slug: slugToSegments(slug) }))
  // Cache Components fails the build on an empty list; "/" always exists as a route.
  return params.some((p) => p.slug.length === 0) ? params : [{ slug: [] }, ...params]
}

export async function getSitemap(): Promise<MetadataRoute.Sitemap> {
  return (await getPageIndex())
    .filter(({ noIndex }) => !noIndex)
    .map(({ slug, _updatedAt }) => ({
      url: new URL(slugToPath(slug), siteUrl).toString(),
      lastModified: new Date(_updatedAt),
    }))
}
