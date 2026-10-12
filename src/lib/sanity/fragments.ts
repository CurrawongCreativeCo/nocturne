/**
 * Shared projection fragments ("atoms"). Plain strings, not `defineQuery`:
 * TypeGen resolves `${interpolations}` statically, so fragments are type-checked
 * through every query that embeds them.
 *
 * Fragments are projection *bodies* (no braces) so callers can extend them:
 *   `image{ ${imageFields}, caption }`
 */

/** Everything <SanityImage /> needs: crop/hotspot for framing, dimensions + LQIP for layout/blur. */
export const imageFields = /* groq */ `
  alt,
  crop,
  hotspot,
  asset->{
    _id,
    url,
    metadata { lqip, dimensions { width, height, aspectRatio } }
  }
`

/** Resolves internal references to a slug, so the frontend never needs a second query. */
export const linkFields = /* groq */ `
  linkType,
  "slug": internal->slug.current,
  url,
  openInNewTab
`

export const ctaFields = /* groq */ `
  _key,
  label,
  variant,
  link { ${linkFields} }
`

export const seoFields = /* groq */ `
  metaTitle,
  metaDescription,
  noIndex,
  ogImage { ${imageFields} }
`
