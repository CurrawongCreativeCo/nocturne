import {
  ctaFields,
  formFields,
  imageFields,
  portableTextFields,
  stripePriceFields,
} from '@/lib/sanity/fragments'

/**
 * One query slice per page-builder section, colocated by name with its schema
 * and component. Each is a conditional projection (`_type == "x" => {...}`);
 * TypeGen turns the set into a discriminated union on `_type`.
 *
 * Arrays a component maps over are wrapped in `coalesce(…, [])`. TypeGen's required-field typing
 * says they're always present, but drafts aren't validated (a section an editor just added has no
 * items yet) and older content may predate a rule, so the query makes the types true.
 *
 * Members-only sections (`access == "members"`) project only their `_key`, `_type` and `access`
 * unless the query's `$members` parameter is true, so the cached public result never holds their
 * content. Only code that has already checked the visitor's session passes `$members: true`.
 */

export const heroFragment = /* groq */ `
  _type == "hero" && (access != "members" || $members) => {
    title,
    description,
    ctas[] { ${ctaFields} },
    backgroundImage { ${imageFields} },
    showGreeting
  }
`

export const richTextFragment = /* groq */ `
  _type == "richText" && (access != "members" || $members) => {
    body[] { ${portableTextFields} }
  }
`

export const mediaTextFragment = /* groq */ `
  _type == "mediaText" && (access != "members" || $members) => {
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
    title,
    intro,
    "columns": coalesce(columns, 3),
    "items": coalesce(items[] {
      _key,
      title,
      text,
      icon { ${imageFields} }
    }, [])
  }
`

export const logoCloudFragment = /* groq */ `
  _type == "logoCloud" && (access != "members" || $members) => {
    title,
    "logos": coalesce(logos[] {
      _key,
      name,
      url,
      image { ${imageFields} }
    }, [])
  }
`

export const testimonialsFragment = /* groq */ `
  _type == "testimonials" && (access != "members" || $members) => {
    title,
    "items": coalesce(items[] {
      _key,
      quote,
      name,
      role,
      avatar { ${imageFields} }
    }, [])
  }
`

export const faqFragment = /* groq */ `
  _type == "faq" && (access != "members" || $members) => {
    title,
    intro,
    "items": coalesce(items[] {
      _key,
      question,
      answer[] { ${portableTextFields} }
    }, [])
  }
`

export const ctaBannerFragment = /* groq */ `
  _type == "ctaBanner" && (access != "members" || $members) => {
    title,
    text,
    ctas[] { ${ctaFields} },
    tone
  }
`

export const formSectionFragment = /* groq */ `
  _type == "formSection" && (access != "members" || $members) => {
    title,
    text,
    form-> { _id, ${formFields} }
  }
`

export const pricingTableFragment = /* groq */ `
  _type == "pricingTable" && (access != "members" || $members) => {
    title,
    intro,
    // Plans whose price was deleted or archived at Stripe are left out rather than shown unbuyable.
    "plans": coalesce(plans[defined(price->priceId) && price->active == true] {
      _key,
      name,
      features,
      highlighted,
      ctaLabel,
      price-> { ${stripePriceFields} }
    }, [])
  }
`

export const newsletterSignupFragment = /* groq */ `
  _type == "newsletterSignup" && (access != "members" || $members) => {
    title,
    text,
    submitLabel,
    successMessage
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
