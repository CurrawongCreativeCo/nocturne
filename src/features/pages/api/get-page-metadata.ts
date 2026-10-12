import type { Metadata } from 'next'

import { slugToPath } from '@/config/paths'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED } from '@/lib/sanity/live'

import { PAGE_METADATA_QUERY } from './queries'

/** Always published SEO data: metadata must stay prerenderable, and drafts shouldn't leak into <head>. */
export async function getPageMetadata(slug: string): Promise<Metadata> {
  const { data: page } = await cachedSanityFetch({
    query: PAGE_METADATA_QUERY,
    params: { slug },
    ...PUBLISHED,
    stega: false,
  })
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
