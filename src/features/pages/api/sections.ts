import {
  ctaFields,
  formFields,
  heroSupportingFields,
  imageFields,
  portableTextFields,
  sectionStyleFields,
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

export const heroFragment = /* groq */ `
  _type == "hero" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    variant,
    eyebrow,
    title,
    heading,
    "headingPlain": pt::text(heading),
    description,
    ctas[] { ${ctaFields} },
    backgroundImage { ${imageFields} },
    imagePosition,
    proportion,
    imageShape,
    secondaryImage { ${imageFields} },
    supporting[] { ${heroSupportingFields} },
    showGreeting
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
    body[] { ${portableTextFields} },
    ctas[] { ${ctaFields} },
    image { ${imageFields} },
    imagePosition
  }
`

export const featuresGridFragment = /* groq */ `
  _type == "featuresGrid" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    intro,
    columns,
    items[] {
      _key,
      title,
      text,
      icon { ${imageFields} }
    }
  }
`

export const logoCloudFragment = /* groq */ `
  _type == "logoCloud" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    logos[] {
      _key,
      name,
      url,
      image { ${imageFields} }
    }
  }
`

export const testimonialsFragment = /* groq */ `
  _type == "testimonials" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    items[] {
      _key,
      quote,
      name,
      role,
      avatar { ${imageFields} }
    }
  }
`

export const faqFragment = /* groq */ `
  _type == "faq" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    intro,
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
    text,
    ctas[] { ${ctaFields} },
    tone
  }
`

export const formSectionFragment = /* groq */ `
  _type == "formSection" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    text,
    form-> { _id, ${formFields} }
  }
`

export const pricingTableFragment = /* groq */ `
  _type == "pricingTable" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
    intro,
    // Plans whose price was deleted or archived at Stripe are left out rather than shown unbuyable.
    plans[defined(price->priceId) && price->active == true] {
      _key,
      name,
      features,
      highlighted,
      ctaLabel,
      price-> { ${stripePriceFields} }
    }
  }
`

export const newsletterSignupFragment = /* groq */ `
  _type == "newsletterSignup" && (access != "members" || $members) => {
    style { ${sectionStyleFields} },
    title,
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
    intro,
    items[] { ${statItemFields} }
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
