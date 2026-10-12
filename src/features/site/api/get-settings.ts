import type { Metadata } from 'next'

import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

import { SETTINGS_QUERY } from './queries'

export async function getSettings(mode: FetchMode) {
  // Menu links resolve page slugs, so a page change can change the settings result too.
  const { data } = await cachedSanityFetch({ query: SETTINGS_QUERY, ...mode, tags: [TAGS.settings, TAGS.page] })
  return data
}

/** Site-wide defaults; each page's own metadata overrides them. Shares the published settings entry. */
export async function getSiteMetadata(): Promise<Metadata> {
  const settings = await getSettings(PUBLISHED)
  const title = settings?.title || 'Site'
  const ogImage = settings?.ogImage?.asset
    ? urlFor({ asset: { _ref: settings.ogImage.asset._id } }).width(1200).height(630).fit('crop').url()
    : undefined

  return {
    title: { template: `%s | ${title}`, default: title },
    description: settings?.description ?? undefined,
    openGraph: { siteName: title, ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }) },
  }
}
