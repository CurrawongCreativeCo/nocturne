import { defineQuery } from 'next-sanity'

import { panelFields, seoFields } from '@/lib/sanity/fragments'

import { pageBuilderFragment, panelRefsFragment } from './sections'

/**
 * Full queries. Every query is wrapped in `defineQuery` so TypeGen emits a
 * `<NAME>_RESULT` type and registers it for `sanityFetch` inference.
 *
 * Kept deliberately few: each distinct query is a separate cache entry and a
 * separate CDN request whenever its content changes. The page and its metadata
 * share PAGE_QUERY (`$members` stays false for every public read: see `sections.ts`), which also
 * carries the panels its buttons open, so opening one never costs a request; static params, the sitemap and breadcrumbs share PAGE_INDEX_QUERY; REDIRECTS_QUERY
 * is only read for URLs that match no page, and when a redirect is published to rebuild the
 * Edge Config map.
 */

export const PAGE_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    _type,
    "title": select(access == "members" && !$members => "Members only", title),
    access,
    seo { ${seoFields} },
    "pageBuilder": select(
      access == "members" && !$members => [],
      pageBuilder[] { ${pageBuilderFragment} }[_type != "reference"]
    ),
    "panels": select(
      access == "members" && !$members => [],
      *[_type == "panel" && _id in (${panelRefsFragment})] { ${panelFields} }
    )
  }
`)

export const PAGE_INDEX_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && defined(slug.current)] {
    "slug": slug.current,
    "title": select(access == "members" => "Members only", title),
    "description": seo.metaDescription,
    _updatedAt,
    "noIndex": seo.noIndex == true || access == "members"
  }
`)

/**
 * Cheap count that sizes the sitemap; see `generateSitemaps`. The style guide's fixture page (the
 * reserved `section-gallery` slug, GALLERY_SEGMENT) is left out here and in the slice below.
 */
export const PAGE_COUNT_QUERY = defineQuery(/* groq */ `
  count(*[_type == "page" && defined(slug.current) && slug.current != "section-gallery"])
`)

/** One sitemap file's slice of the page index, only used once the site outgrows a single file. */
export const PAGE_SITEMAP_QUERY = defineQuery(/* groq */ `
  *[_type == "page" && defined(slug.current) && slug.current != "section-gallery"] | order(_id) [$start...$end] {
    "slug": slug.current,
    _updatedAt,
    "noIndex": seo.noIndex == true || access == "members"
  }
`)

export const REDIRECTS_QUERY = defineQuery(/* groq */ `
  *[_type == "redirect" && defined(source) && defined(destination)] {
    source,
    destination,
    "permanent": permanent != false
  }
`)
