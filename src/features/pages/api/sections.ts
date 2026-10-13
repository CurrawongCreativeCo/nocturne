import { ctaFields, imageFields, portableTextFields } from '@/lib/sanity/fragments'

/**
 * One query slice per page-builder section, colocated by name with its schema
 * and component. Each is a conditional projection (`_type == "x" => {...}`);
 * TypeGen turns the set into a discriminated union on `_type`.
 */

export const heroFragment = /* groq */ `
  _type == "hero" => {
    title,
    description,
    ctas[] { ${ctaFields} },
    backgroundImage { ${imageFields} }
  }
`

export const richTextFragment = /* groq */ `
  _type == "richText" => {
    body[] { ${portableTextFields} }
  }
`

export const mediaTextFragment = /* groq */ `
  _type == "mediaText" => {
    eyebrow,
    title,
    body[] { ${portableTextFields} },
    ctas[] { ${ctaFields} },
    image { ${imageFields} },
    imagePosition
  }
`

export const featuresGridFragment = /* groq */ `
  _type == "featuresGrid" => {
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
  _type == "logoCloud" => {
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
  _type == "testimonials" => {
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
  _type == "faq" => {
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
  _type == "ctaBanner" => {
    title,
    text,
    ctas[] { ${ctaFields} },
    tone
  }
`

// new-section:fragment

/** Every section's projection. Register new section fragments here, above `_type`. */
const sectionsFragment = /* groq */ `
  ${heroFragment},
  ${richTextFragment},
  ${mediaTextFragment},
  ${featuresGridFragment},
  ${logoCloudFragment},
  ${testimonialsFragment},
  ${faqFragment},
  ${ctaBannerFragment},
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
