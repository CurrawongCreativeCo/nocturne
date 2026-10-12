import type { Metadata } from 'next'

import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED } from '@/lib/sanity/live'

import { SITE_METADATA_QUERY } from './queries'

const FALLBACK_TITLE = 'Site'

/** Site-wide defaults; each page's own metadata overrides them. Published content only. */
export async function getSiteMetadata(): Promise<Metadata> {
  const { data } = await cachedSanityFetch({ query: SITE_METADATA_QUERY, ...PUBLISHED, stega: false })
  const title = data?.title || FALLBACK_TITLE
  const ogImage = data?.ogImage?.asset
    ? urlFor({ asset: { _ref: data.ogImage.asset._id } }).width(1200).height(630).fit('crop').url()
    : undefined

  return {
    title: { template: `%s | ${title}`, default: title },
    description: data?.description ?? undefined,
    openGraph: { siteName: title, ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }) },
  }
}
