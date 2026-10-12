import { defineQuery } from 'next-sanity'

import { ctaFields, imageFields, linkFields } from '@/lib/sanity/fragments'

const navItemFields = /* groq */ `
  _key,
  label,
  link { ${linkFields} }
`

export const SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id == "settings"][0] {
    title,
    logo { ${imageFields} },
    headerNav[] { ${navItemFields} },
    headerCta { ${ctaFields} },
    footerNav[] { ${navItemFields} },
    footerText
  }
`)

/** Lightweight, always-published: feeds the root metadata. */
export const SITE_METADATA_QUERY = defineQuery(/* groq */ `
  *[_id == "settings"][0] {
    title,
    description,
    ogImage { asset->{ _id } }
  }
`)
