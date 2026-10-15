import type { Metadata } from 'next'

import { dataset, projectId } from '@/config/env'
import { urlFor } from '@/lib/sanity/image'
import { cachedSanityFetch, PUBLISHED, TAGS, type FetchMode } from '@/lib/sanity/live'

import { SETTINGS_QUERY } from './queries'
import { browserIconLinks } from '../utils/browser-icon'

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
  return data
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

  // Next.js adds src/app/icon.png and apple-icon.png only when `icons` is unset, so setting it here
  // replaces them (never two <link rel="icon"> sets). Without a custom icon the default files apply.
  const browserIcon = settings?.browserIcon
  const icons = browserIcon?.image
    ? browserIconLinks(browserIcon.image, browserIcon, { projectId, dataset })
    : undefined

  const description = settings?.description ?? undefined
  const template = { template: `%s | ${title}`, default: title }

  // Next.js copies these Open Graph values into the Twitter tags; it never copies `title` or
  // `description` into Open Graph, so they're set explicitly. Pages extend this (see getPageMetadata).
  return {
    title: template,
    description,
    ...(icons && { icons }),
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
