import { ctaFields, imageFields } from '@/lib/sanity/fragments'

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

/** Spread into `pageBuilder[]{ ... }`. Register new section fragments here. */
export const pageBuilderFragment = /* groq */ `
  _key,
  _type,
  ${heroFragment},
  ${featuresGridFragment}
`
