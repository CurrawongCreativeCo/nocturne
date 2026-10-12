import { defineQuery } from 'next-sanity'

import { ctaFields, imageFields, linkFields } from '@/lib/sanity/fragments'

const navItemFields = /* groq */ `
  _key,
  label,
  link { ${linkFields} }
`

/** One query for the header, footer and site metadata: one cache entry, one request per change. */
export const SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id == "settings"][0] {
    title,
    description,
    logo { ${imageFields} },
    ogImage { asset->{ _id } },
    headerNav[] { ${navItemFields} },
    headerCta { ${ctaFields} },
    footerNav[] { ${navItemFields} },
    footerText
  }
`)
