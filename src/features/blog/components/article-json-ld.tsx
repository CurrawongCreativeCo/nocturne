import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { siteLanguage } from '@/config/env'
import { postPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'

import type { PostData } from '../types'
import { authorName } from '../utils/author'

/**
 * schema.org Article for a post. The publisher points at the Organization that the site layout
 * already describes (site-json-ld.tsx), so it isn't repeated here.
 */
export function ArticleJsonLd({ post }: { post: PostData }) {
  const { mainImage } = post
  const image = mainImage.asset
    ? urlFor({
        asset: { _ref: mainImage.asset._id },
        crop: mainImage.crop ?? undefined,
        hotspot: mainImage.hotspot ?? undefined,
      })
        .width(1200)
        .url()
    : undefined
  const author = authorName(post.author)

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': new URL(postPath(stegaClean(post.slug)), siteUrl).toString(),
        },
        headline: stegaClean(post.title),
        description: stegaClean(post.excerpt),
        ...(image && { image: [image] }),
        datePublished: stegaClean(post.publishedAt),
        dateModified: stegaClean(post._updatedAt),
        ...(author && { author: { '@type': 'Person', name: stegaClean(author) } }),
        publisher: { '@id': `${new URL('/', siteUrl).toString()}#organization` },
        ...(post.categories?.length && {
          articleSection: post.categories.map((category) => stegaClean(category.title)),
        }),
        inLanguage: siteLanguage,
      }}
    />
  )
}
