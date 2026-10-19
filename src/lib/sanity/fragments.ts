/**
 * Shared projection fragments ("atoms"). Plain strings, not `defineQuery`:
 * TypeGen resolves `${interpolations}` statically, so fragments are type-checked
 * through every query that embeds them.
 *
 * Fragments are projection *bodies* (no braces) so callers can extend them:
 *   `image{ ${imageFields}, caption }`
 */

/** Everything <SanityImage /> needs: crop/hotspot for framing, dimensions + LQIP for layout/blur, `hasAlpha` so a transparent picture gets no blur. */
export const imageFields = /* groq */ `
  alt,
  crop,
  hotspot,
  asset->{
    _id,
    metadata { lqip, hasAlpha, dimensions { width, height } }
  }
`

/** A `decorativeDivider` (schema: lib/sanity/schema/decorative-divider.ts): project it as `divider { ${decorativeDividerFields} }`. */
export const decorativeDividerFields = /* groq */ `
  style,
  width,
  thickness,
  centre,
  text,
  textCase,
  icon,
  centreSize,
  image { ${imageFields} },
  lineColour { colour, hex },
  centreColour { colour, hex }
`

/**
 * A section's `imageDesign` (schema: lib/sanity/schema/image-design.ts): project it as
 * `imageDesign { ${imageDesignFields} }`. The approved custom frame is resolved to its SVG's CDN URL
 * here, so a page needs no second request (it is tagged `frame`, so editing a frame expires the pages).
 */
export const imageDesignFields = /* groq */ `
  appearance,
  motion,
  custom,
  travel,
  direction,
  scale,
  frame,
  frameColour,
  frameInset,
  "customFrameUrl": customFrame->svg.asset->url
`

/**
 * Resolves internal references to a slug, so the frontend never needs a second query. A panel
 * resolves to its id and title only; the panel's content is rendered by the panel feature.
 */
export const linkFields = /* groq */ `
  linkType,
  "slug": internal->slug.current,
  url,
  openInNewTab,
  anchor,
  "panel": panel->{ "id": _id, title },
  fallbackUrl,
  bookingUrl
`

export const ctaFields = /* groq */ `
  _key,
  label,
  variant,
  link { ${linkFields} }
`

/**
 * An event as a list or card shows it: when, where in a word, what kind, and its state. Timing is
 * returned raw (`start`, `end`, `recurrence`): a cached result can't know today's date, so
 * occurrences are worked out at request time (lib/events). The registration button, description and
 * address are left for the event's own page.
 */
export const eventCardFields = /* groq */ `
  _id,
  "slug": slug.current,
  title,
  start,
  end,
  allDay,
  timeZone,
  summary,
  status,
  capacityNote,
  image { ${imageFields} },
  "category": category->title,
  location { kind, name },
  recurrence { repeat, until, skip }
`

/**
 * The latest moment an event can still matter, as a sortable string: a series with no end date
 * never stops mattering ("9999"), a series with one matters until it, and any other event until its
 * end (or its start). `order(${eventLastRelevant} desc)[0...n]` keeps what is coming, however long
 * the history, without reading the clock (a cached result can't): everything not finished sorts
 * ahead of everything that is.
 */
export const eventLastRelevant = /* groq */ `select(
  recurrence.repeat in ["weekly", "fortnightly", "monthly"] && !defined(recurrence.until) => "9999-12-31",
  recurrence.repeat in ["weekly", "fortnightly", "monthly"] => recurrence.until,
  coalesce(end, start)
)`

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
 * A `launchDate` (schema: lib/sanity/schema/launch-date.ts): project it as `launchDate { ${launchDateFields} }`.
 * The time zone is Business info's, read here so the page needs no second request; the page's cache
 * tags include businessInfo, so changing the zone refreshes it.
 */
export const launchDateFields = /* groq */ `
  label,
  date,
  time,
  countdown,
  "timeZone": *[_id == "businessInfo"][0].timeZone
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
  _type == "logoRow" => { ${logoRowFields} },
  _type == "launchDate" => { ${launchDateFields} }
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
  motionIntensity,
  motionDuration,
  motionDelay,
  motionDirection,
  motionTrigger,
  motionCustom,
  motionDurationMs,
  motionDistancePx,
  motionEasing,
  motionThreshold,
  gradient,
  overlay,
  overlayColor,
  imageSize,
  imageVertical,
  imageHorizontal,
  imageRepeat,
  imageStrength,
  imageStrengthPercent,
  imageFixed,
  fillScreen,
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

/**
 * A panel as the page needs it to render (schema: features/panels/schemas). Pages fetch the panels
 * their buttons and links open inside PAGE_QUERY, so opening one never costs a request. Its form
 * is `formFields` again: without `recipientEmail`, like every form on a page.
 */
export const panelFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  presentation,
  width,
  swipeToClose,
  content[] {
    _key,
    _type,
    _type == "panelText" => {
      image { ${imageFields} },
      body[] { ${portableTextFields} }
    },
    _type == "panelForm" => {
      form-> { _id, ${formFields} }
    }
  }
`
