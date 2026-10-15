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

/** One `statItem` (schema: lib/sanity/schema/stats.ts), for the Stats section and the hero's statistics bar. */
export const statItemFields = /* groq */ `
  _key,
  value,
  decimals,
  prefix,
  suffix,
  label
`

/** A `statsBar`: project it as `statsBar { ${statsBarFields} }`. */
export const statsBarFields = /* groq */ `
  items[] { ${statItemFields} },
  caption
`

/** A `badgeRow` (schema: lib/sanity/schema/badge-row.ts): project it as `badgeRow { ${badgeRowFields} }`. */
export const badgeRowFields = /* groq */ `
  badges[] { _key, label, icon }
`

/** A `logoRow` (schema: lib/sanity/schema/logo-row.ts): project it as `logoRow { ${logoRowFields} }`. */
export const logoRowFields = /* groq */ `
  greyscale,
  logos[] { _key, name, image { ${imageFields} } }
`

/**
 * The hero's supporting slot: the one item of `supporting[]`, whichever approved type it is. A new
 * slot type adds its conditional projection here (README, "Adding a hero slot").
 */
export const heroSupportingFields = /* groq */ `
  _key,
  _type,
  _type == "statsBar" => { ${statsBarFields} },
  _type == "badgeRow" => { ${badgeRowFields} },
  _type == "logoRow" => { ${logoRowFields} }
`

/**
 * A section's shared layout and style options (schema: lib/sanity/schema/section-style.ts). Every
 * section fragment projects it as `style { ${sectionStyleFields} }`; SectionFrame reads it.
 */
export const sectionStyleFields = /* groq */ `
  tone,
  spacing,
  width,
  align,
  anchorId,
  motion,
  gradient,
  overlay,
  image { ${imageFields} },
  edge,
  edgeHeight,
  edgeFlip,
  edgeAccent,
  edgeLayer,
  edgeInvert,
  edgeHeightMobile,
  edgeHeightTablet,
  edgeHeightDesktop
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

/**
 * A Stripe price as the pricing table shows it. These documents are written by the Stripe webhook
 * (features/pricing), never by editors. `productName` is the product's name at Stripe.
 */
export const stripePriceFields = /* groq */ `
  priceId,
  productName,
  amount,
  currency,
  interval,
  intervalCount
`
