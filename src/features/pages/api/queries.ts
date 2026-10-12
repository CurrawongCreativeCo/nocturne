import { defineQuery } from 'next-sanity'

import { seoFields } from '@/lib/sanity/fragments'

import { pageBuilderFragment } from './sections'

/**
 * Full queries. Every query is wrapped in `defineQuery` so TypeGen emits a
 * `<NAME>_RESULT` type and registers it for `sanityFetch` inference.
 *
 * Kept deliberately few: each distinct query is a separate cache entry and a
 * separate CDN request whenever its content changes. The page and its metadata
 * share PAGE_QUERY; static params and the sitemap share PAGE_INDEX_QUERY.
 */

export const PAGE_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    _type,
    title,
    seo { ${seoFields} },
    pageBuilder[] { ${pageBuilderFragment} }
  }
`)

export const PAGE_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && defined(slug.current)] {
    "slug": slug.current,
    _updatedAt,
    "noIndex": seo.noIndex == true
  }
`)
