import { iconDesignFields, imageFields, portableTextFields } from '@/lib/sanity/fragments'

/** The projections of a member's page, apart from the fetch so the capability evidence can use them. */
export const teamMemberFields = /* groq */ `
  _id,
  _type,
  _updatedAt,
  name,
  role,
  "slug": slug.current,
  portrait { ${imageFields} },
  shortBio,
  bio[] { ${portableTextFields} },
  qualifications,
  publicEmail,
  phone,
  socialLinks[] { _key, platform, url },
  socialDisplay
`

/** The Team page settings, as a member's page reads them: part of the member's query, no second fetch. */
export const teamPageSettingsFields = /* groq */ `
  iconDesign { ${iconDesignFields} }
`
