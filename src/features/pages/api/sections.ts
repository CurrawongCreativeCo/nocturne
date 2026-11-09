import {
  ctaFields,
  eventCardFields,
  eventLastRelevant,
  formFields,
  decorativeDividerFields,
  heroSupportingFields,
  imageDesignFields,
  imageFields,
  linkFields,
  decorativeMarkFields,
  iconDesignFields,
  portableTextFields,
  sectionStyleFields,
  splitMediaFields,
  splitSupportingFields,
  statItemFields,
  stripePriceFields,
} from '@/lib/sanity/fragments'

/**
 * One query slice per page-builder section, colocated by name with its schema
 * and component. Each is a conditional projection (`_type == "x" => {...}`);
 * TypeGen turns the set into a discriminated union on `_type`.
 *
 * Members-only sections (`access == "members"`) project only their `_key`, `_type` and `access`
 * unless the query's `$members` parameter is true, so the cached public result never holds their
 * content. Only code that has already checked the visitor's session passes `$members: true`.
 */

/** One text element's look (lib/sanity/text-style-options.ts). */
const textStyleProjection = /* groq */ `size, weight, colour { colour, hex }, textCase, tracking, leading`

/** A card's fill and border, and its icon's container (lib/sanity/surface-options.ts). */
const surfaceProjection = /* groq */ `
  background { colour, hex },
  backgroundStrength,
  border,
  borderColour { colour, hex }
`

/** A role's text style, with the italic only a quote offers (lib/sanity/text-role.ts). */
const roleStyleProjection = /* groq */ `${textStyleProjection}, fontStyle`

/** The section header's eyebrow field and its three roles (components/ui/section-header.tsx). */
const headerDesignProjection = /* groq */ `
  eyebrow,
  headerDesign {
    eyebrow { ${roleStyleProjection} },
    heading { ${roleStyleProjection} },
    intro { ${roleStyleProjection} }
  }
`

export const heroFragment = /* groq */ `
  _type == "hero" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    eyebrow,
    eyebrowLabels,
    eyebrowDesign {
      separator,
      textColour { colour, hex },
      separatorColour { colour, hex }
    },
    title,
    heading,
    "headingPlain": pt::text(heading),
    description,
    ctas[] { ${ctaFields} },
    backgroundImage { ${imageFields} },
    imagePosition,
    proportion,
    imageShape,
    imageDesign { ${imageDesignFields} },
    secondaryImage { ${imageFields} },
    supporting[] { ${heroSupportingFields} },
    showGreeting,
    partMotion {
      enabled,
      eyebrowPreset, eyebrowDelay,
      headingPreset, headingDelay,
      descriptionPreset, descriptionDelay,
      buttonsPreset, buttonsDelay,
      slotPreset, slotDelay,
      imagePreset, imageDelay,
      backgroundPreset, backgroundDelay
    }
  }
`

export const richTextFragment = /* groq */ `
  _type == "richText" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    body[] { ${portableTextFields} }
  }
`

export const mediaTextFragment = /* groq */ `
  _type == "mediaText" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    eyebrow,
    title,
    heading,
    "headingPlain": pt::text(heading),
    headerDesign {
      eyebrow { ${roleStyleProjection} },
      heading { ${roleStyleProjection} },
      intro { ${roleStyleProjection} }
    },
    body[] { ${portableTextFields} },
    ctas[] { ${ctaFields} },
    image { ${imageFields} },
    media[] { ${splitMediaFields} },
    supporting[] { ${splitSupportingFields} },
    imageDesign { ${imageDesignFields} },
    imagePosition,
    variant
  }
`

export const featuresGridFragment = /* groq */ `
  _type == "featuresGrid" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    columns,
    iconDesign { ${iconDesignFields} },
    items[] {
      _key,
      title,
      text,
      iconName,
      icon { ${imageFields} }
    }
  }
`

export const logoCloudFragment = /* groq */ `
  _type == "logoCloud" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    logoColour,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    logos[] {
      _key,
      name,
      url,
      image { ${imageFields} }
    }
  }
`

/**
 * The title, meta and body roles, a fill and a mark: the Team's box for its cards and rows, and the Events
 * section's (whose Featured layout draws the one card).
 */
/** A card's shadow level and glow (depthFields). */
const depthProjection = /* groq */ `shadow, glow, glowColour { colour, hex }`

const teamCardDesignProjection = /* groq */ `
  ${surfaceProjection},
  ${depthProjection},
  title { ${roleStyleProjection} },
  meta { ${roleStyleProjection} },
  body { ${roleStyleProjection} },
  mark { ${decorativeMarkFields} },
  actionStyle,
  actionMotion,
  actionColour { colour, hex }
`

/** Pricing's card design at section level and, behind the plan's Appearance switch, at item level. */
const pricingCardDesignProjection = /* groq */ `
  ${surfaceProjection},
  ${depthProjection},
  title { ${roleStyleProjection} },
  price { ${roleStyleProjection} },
  body { ${roleStyleProjection} },
  label { ${roleStyleProjection} },
  description { ${roleStyleProjection} },
  mark { ${decorativeMarkFields} }
`

/** A testimonial avatar's or team list portrait's size and ring (schema: lib/sanity/schema/avatar-design.ts). */
const avatarDesignFields = /* groq */ `
  size,
  ring,
  ringColour { colour, hex }
`

export const testimonialsFragment = /* groq */ `
  _type == "testimonials" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    cardDesign {
      ${surfaceProjection},
      ${depthProjection},
      quote {
        ${textStyleProjection},
        fontStyle,
        highlight { colour { colour, hex }, weight, fontStyle }
      },
      attribution { ${textStyleProjection} },
      label { ${textStyleProjection} },
      mark { ${decorativeMarkFields} }
    },
    avatarDesign { ${avatarDesignFields} },
    items[] {
      _key,
      quote,
      highlights,
      name,
      role,
      attribution,
      source,
      date,
      rating,
      avatar { ${imageFields} }
    }
  }
`

export const faqFragment = /* groq */ `
  _type == "faq" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    cardDesign {
      itemStyle,
      ${surfaceProjection},
      title { ${roleStyleProjection} },
      body { ${roleStyleProjection} },
      mark { ${decorativeMarkFields} }
    },
    items[] {
      _key,
      question,
      answer[] { ${portableTextFields} }
    }
  }
`

export const ctaBannerFragment = /* groq */ `
  _type == "ctaBanner" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    ${headerDesignProjection},
    cardDesign { ${depthProjection} },
    text,
    ctas[] { ${ctaFields} },
    tone
  }
`

export const formSectionFragment = /* groq */ `
  _type == "formSection" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    ${headerDesignProjection},
    text,
    form-> { _id, ${formFields} }
  }
`

export const pricingTableFragment = /* groq */ `
  _type == "pricingTable" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    iconDesign { ${iconDesignFields} },
    cardDesign { ${pricingCardDesignProjection} },
    // Plans whose price was deleted or archived at Stripe are left out rather than shown unbuyable.
    plans[defined(price->priceId) && price->active == true] {
      _key,
      name,
      description,
      meta,
      badgeText,
      features,
      highlighted,
      ctaLabel,
      design { appearance, ${pricingCardDesignProjection} },
      price-> { ${stripePriceFields} }
    }
  }
`

export const newsletterSignupFragment = /* groq */ `
  _type == "newsletterSignup" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    ${headerDesignProjection},
    text,
    submitLabel,
    successMessage
  }
`

export const statsFragment = /* groq */ `
  _type == "stats" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    cardDesign {
      ${surfaceProjection},
      number { ${roleStyleProjection} },
      label { ${roleStyleProjection} },
      mark { ${decorativeMarkFields} }
    },
    items[] { ${statItemFields} }
  }
`

export const galleryFragment = /* groq */ `
  _type == "gallery" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    columns,
    imageDesign { ${imageDesignFields} },
    images[] { _key, caption, ${imageFields} }
  }
`

export const locationFragment = /* groq */ `
  _type == "location" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    cardDesign {
      ${surfaceProjection},
      ${depthProjection},
      title { ${roleStyleProjection} },
      body { ${roleStyleProjection} },
      meta { ${roleStyleProjection} },
      mark { ${decorativeMarkFields} }
    },
    iconDesign { ${iconDesignFields} },
    mapImage { ${imageFields} },
    showHours,
    showOpenNow,
    showContact,
    showSocial,
    directionsLabel,
    interactiveMap
  }
`

/**
 * What a team card shows. `slug` is only a link target when the site has profile pages
 * (`hasTeamProfiles()`, checked where the card is drawn).
 */
const teamCardFields = /* groq */ `
  _id,
  name,
  role,
  "slug": slug.current,
  shortBio,
  portrait { ${imageFields} }
`

/**
 * The members are resolved here, so a page needs no second request: "everyone" is the team in its
 * drag order (members without an `order` last, then by name; 60 at most, matching TEAM_ALL_LIMIT),
 * "picked" is the editor's own list in their order, leaving out references to members that are not
 * published (or were deleted).
 */
export const teamFragment = /* groq */ `
  _type == "team" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    text,
    ${headerDesignProjection},
    cardDesign { ${teamCardDesignProjection} },
    imageDesign { ${imageDesignFields} },
    portraitDesign { ${avatarDesignFields} },
    "members": select(
      selection == "picked" => members[defined(@->_id)]->{ ${teamCardFields} },
      *[_type == "teamMember"] | order(coalesce(order, 999999) asc, name asc) [0...60] { ${teamCardFields} }
    )
  }
`

export const videoFragment = /* groq */ `
  _type == "video" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    ${headerDesignProjection},
    text,
    source,
    url,
    "fileUrl": file.asset->url,
    "captionsUrl": captions.asset->url,
    poster { ${imageFields} },
    aspectRatio
  }
`

export const processFragment = /* groq */ `
  _type == "process" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    cardDesign {
      label { ${roleStyleProjection} },
      title { ${roleStyleProjection} },
      body { ${roleStyleProjection} }
    },
    iconDesign { ${iconDesignFields} },
    steps[] {
      _key,
      label,
      title,
      text,
      iconName,
      icon { ${imageFields} }
    }
  }
`

export const embedFragment = /* groq */ `
  _type == "embed" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    heading,
    "headingPlain": pt::text(heading),
    ${headerDesignProjection},
    text,
    provider,
    url,
    height,
    customHeight
  }
`

export const linkListFragment = /* groq */ `
  _type == "linkList" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    rowStyle,
    glassStrength,
    showArrows,
    thumbnailSize,
    title,
    heading,
    "headingPlain": pt::text(heading),
    intro,
    ${headerDesignProjection},
    headingDisplay,
    headingImage { size, ${imageFields} },
    profile {
      name,
      // Hidden categories never leave the Content Lake, like hidden links.
      "categories": select(categoriesVisibility != "hide" => categories),
      bio,
      image { ${imageFields} },
      nameDisplay,
      nameImage { size, ${imageFields} }
    },
    // The approved frame is resolved to its artwork's CDN URL, as for imageDesign (tagged \`frame\`).
    profileDesign {
      imageSize,
      imageShape,
      border,
      borderWidth,
      borderGap,
      borderGradient,
      "frameUrl": frame->{"url": select(format == "picture" => picture.asset->url, svg.asset->url)}.url,
      borderColour { colour, hex },
      nameColour { colour, hex },
      bioColour { colour, hex }
    },
    categoryDesign {
      separator,
      size,
      weight,
      textCase,
      letterSpacing,
      gap,
      phoneLayout,
      textColour { colour, hex },
      separatorColour { colour, hex }
    },
    cardDesign {
      ${surfaceProjection},
      eyebrow { ${textStyleProjection} },
      label { ${textStyleProjection} },
      description { ${textStyleProjection} },
      mark { ${decorativeMarkFields} }
    },
    linkDesign {
      arrowStyle,
      arrowColour { colour, hex },
      ${iconDesignFields}
    },
    socialDesign {
      style,
      position,
      iconColour { colour, hex },
      ${surfaceProjection}
    },
    dividerDesign {
      afterCategories { ${decorativeDividerFields} },
      afterProfile { ${decorativeDividerFields} },
      aboveSocial { ${decorativeDividerFields} },
      belowSocial { ${decorativeDividerFields} }
    },
    depthDesign {
      linkShadow,
      socialShadow,
      pictureShadow,
      glow,
      glowTargets,
      glowColour { colour, hex }
    },
    socialSource,
    "socialLinks": select(socialSource == "custom" => socialLinks[] { _key, platform, url }),
    // Hidden links never leave the Content Lake. Scheduled ones do: the browser decides when they are due
    // (the page is cached and can't know the time), see LINK_SCHEDULE_SCRIPT.
    "links": links[visibility != "hide"] {
      _key,
      eyebrow,
      label,
      description,
      icon,
      featured,
      group,
      groupDisplay,
      groupImage { size, ${imageFields} },
      showFrom,
      showUntil,
      utmSource,
      utmMedium,
      utmCampaign,
      thumbnail { ${imageFields} },
      link { ${linkFields} },
      // A card's own Appearance, only while it is set to "Customise this card".
      "design": select(design.appearance == "custom" => design {
        appearance,
        ${surfaceProjection},
        shadow,
        eyebrow { ${textStyleProjection} },
        label { ${textStyleProjection} },
        description { ${textStyleProjection} },
        mark { ${decorativeMarkFields} },
        ${iconDesignFields},
        arrowStyle,
        arrowColour { colour, hex }
      })
    }
  }
`

/**
 * The events are resolved here, so a page needs no second request. The result is cached and can't
 * know today's date, so past events are not filtered out here: the component drops them at request
 * time (see `upcomingEntries`). To keep a long history from crowding out what is coming, events are
 * ordered by the last moment they can matter, latest first (`eventLastRelevant`), and the first 200
 * kept. `^.category` is the section's own category filter.
 */
export const eventsFragment = /* groq */ `
  _type == "events" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    title,
    heading,
    "headingPlain": pt::text(heading),
    text,
    ${headerDesignProjection},
    cardDesign { ${teamCardDesignProjection} },
    count,
    "hasCategoryFilter": defined(category),
    seeAllLabel,
    seeAllLink { ${linkFields} },
    "events": *[_type == "event" && defined(start) && defined(slug.current) && (!defined(^.category) || category._ref == ^.category._ref)]
      | order(${eventLastRelevant} desc) [0...200] { ${eventCardFields} },
    // The zone for an event saved without one (an all-day event).
    "businessTimeZone": *[_id == "businessInfo"][0].timeZone
  }
`

// new-section:fragment

/** Every section's projection. Register new section fragments here, above `_type`. */
const sectionsFragment = /* groq */ `
  access,
  ${heroFragment},
  ${richTextFragment},
  ${mediaTextFragment},
  ${featuresGridFragment},
  ${logoCloudFragment},
  ${testimonialsFragment},
  ${faqFragment},
  ${ctaBannerFragment},
  ${formSectionFragment},
  ${pricingTableFragment},
  ${newsletterSignupFragment},
  ${statsFragment},
  ${galleryFragment},
  ${locationFragment},
  ${teamFragment},
  ${videoFragment},
  ${processFragment},
  ${embedFragment},
  ${linkListFragment},
  ${eventsFragment},
  _type
`

/**
 * Spread into `pageBuilder[]{ ... }`. A reference to a `sharedSection` is replaced by the section it
 * holds, so the renderer only ever sees normal sections. The result keeps the reference's `_key`
 * (unique within the page) and gains `sharedSectionId`, the document Visual Editing should open.
 * It comes last because it overrides `_key` and `_type`; an unresolvable reference yields null.
 */
export const pageBuilderFragment = /* groq */ `
  _key,
  ${sectionsFragment},
  _type == "reference" => @->section[0] {
    ${sectionsFragment},
    "_key": ^._key,
    "sharedSectionId": ^._ref
  }
`

/**
 * The panels a page's buttons and links open, as ids, read from the page's own sections and from
 * the shared sections it uses (members-only ones only once `$members` is true, so the cached public
 * result never carries a panel that only a members-only section opens). A link can sit in a
 * section's `ctas`, in rich text (`body`, or a FAQ `answer`), in a Link list's `links` (those the
 * list can show) or in a link field of its own (Events' `seeAllLink`); a section type that gets links
 * anywhere else must add its path here: sections.test.ts fails until it does. Used inside
 * PAGE_QUERY as `_id in (${panelRefsFragment})`, where `^` is the page. It lists paths because
 * GROQ's recursive descent (`..`) isn't available in the fake Content Lake the tests run on.
 */
const pageSections = `^.pageBuilder[access != "members" || $members]`
const sharedSections = `^.pageBuilder[_type == "reference"]->section[access != "members" || $members]`

export const panelRefsFragment = /* groq */ `
  coalesce(${pageSections}.ctas[].link.panel._ref, [])
  + coalesce(${pageSections}.links[visibility != "hide"].link.panel._ref, [])
  + coalesce(${pageSections}.seeAllLink.panel._ref, [])
  + coalesce(${pageSections}.body[].markDefs[].panel._ref, [])
  + coalesce(${pageSections}.items[].answer[].markDefs[].panel._ref, [])
  + coalesce(${sharedSections}.ctas[].link.panel._ref, [])
  + coalesce(${sharedSections}.links[visibility != "hide"].link.panel._ref, [])
  + coalesce(${sharedSections}.seeAllLink.panel._ref, [])
  + coalesce(${sharedSections}.body[].markDefs[].panel._ref, [])
  + coalesce(${sharedSections}.items[].answer[].markDefs[].panel._ref, [])
`
