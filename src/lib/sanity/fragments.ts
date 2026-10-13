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
    metadata { lqip, dimensions { width, height } }
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

/**
 * Body of a `blockContent` array projection: `body[]{ ${portableTextFields} }`.
 * Resolves internal link annotations to slugs and inline images to their assets.
 */
export const portableTextFields = /* groq */ `
  ...,
  markDefs[]{
    ...,
    _type == "link" => { ${linkFields} }
  },
  _type == "image" => { caption, ${imageFields} }
`

/**
 * A form as the page needs it to render. Deliberately leaves out `recipientEmail`: pages and their
 * cached results never carry it. Only the submit action reads it (see features/forms/api/queries.ts).
 */
export const formFields = /* groq */ `
  title,
  submitLabel,
  fields[] {
    _key,
    label,
    name,
    type,
    required,
    options
  }
`
