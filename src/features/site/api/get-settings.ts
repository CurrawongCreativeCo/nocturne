import type { Metadata } from 'next'

import { dataset, projectId } from '@/config/env'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

import { SETTINGS_QUERY } from './queries'
import { browserIconLinks, DEFAULT_BROWSER_ICONS } from '../utils/browser-icon'
import { hasBusinessDetails } from '../utils/business-details'

export async function getSettings(mode: FetchMode) {
  // Menu links resolve page slugs, so a page change can change the settings result too.
  const { data } = await cachedSanityFetch({
    query: SETTINGS_QUERY,
    ...mode,
    tags: [
      TAGS.siteIdentity,
      TAGS.siteNavigation,
      TAGS.announcement,
      TAGS.cookieBanner,
      TAGS.designSettings,
      TAGS.businessInfo,
      TAGS.page,
    ],
  })
  // An empty Business info document (the setup wizard creates one) counts as none.
  return data && !hasBusinessDetails(data.business) ? { ...data, business: null } : data
}

/** Site-wide defaults; each page's own metadata overrides them. Shares the published settings entry. */
export async function getSiteMetadata(): Promise<Metadata> {
  const settings = await getSettings(PUBLISHED)
  const title = settings?.title || 'Site'
  const ogImage = settings?.ogImage?.asset
    ? urlFor({ asset: { _ref: settings.ogImage.asset._id } })
        .width(1200)
        .height(630)
        .fit('crop')
        .url()
    : undefined

  // Explicit defaults include a small tab icon; the original 512 px file stays available for Android.
  // Setting `icons` replaces Next's file-based links, so a client's own artwork always wins.
  const browserIcon = settings?.browserIcon
  const icons = browserIcon?.image
    ? browserIconLinks(browserIcon.image, browserIcon, { projectId, dataset })
    : DEFAULT_BROWSER_ICONS

  const description = settings?.description ?? undefined
  const template = { template: `%s | ${title}`, default: title }

  // Next.js copies these Open Graph values into the Twitter tags; it never copies `title` or
  // `description` into Open Graph, so they're set explicitly. Pages extend this (see getPageMetadata).
  return {
    title: template,
    description,
    icons,
    openGraph: {
      type: 'website',
      siteName: title,
      title: template,
      description,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: { card: 'summary_large_image' },
  }
}
