import { defineQuery } from 'next-sanity'

import { seoFields } from '@/lib/sanity/fragments'
import { pageBuilderFragment } from './sections'

/**
 * Full queries. Every query is wrapped in `defineQuery` so TypeGen emits a
 * `<NAME>_RESULT` type and registers it for `sanityFetch` inference.
 */

export const PAGE_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    _type,
    title,
    "slug": slug.current,
    pageBuilder[] { ${pageBuilderFragment} }
  }
`)

/** Lightweight: generateMetadata shouldn't pull the whole page builder. */
export const PAGE_METADATA_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && slug.current == $slug][0] {
    title,
    seo { ${seoFields} }
  }
`)

export const PAGE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && defined(slug.current)].slug.current
`)

export const SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && defined(slug.current) && seo.noIndex != true] {
    "slug": slug.current,
    _updatedAt
  }
`)
