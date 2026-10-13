import { defineQuery } from 'next-sanity'

import { ctaFields, imageFields, linkFields } from '@/lib/sanity/fragments'

const navItemFields = /* groq */ `
  _key,
  label,
  link { ${linkFields} }
`

/** One query for the announcement bar, header, footer and site metadata: one cache entry, one request per change. */
export const SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id == "settings"][0] {
    title,
    description,
    logo { ${imageFields} },
    ogImage { asset->{ _id } },
    announcement { message, link { ${linkFields} }, startsAt, endsAt, dismissible },
    headerNav[] { ${navItemFields} },
    headerCta { ${ctaFields} },
    footerNav[] { ${navItemFields} },
    footerText,
    consent { title, message, privacyLabel, privacyLink { ${linkFields} }, analyticsText, marketingText },
    "allowAiCrawlers": allowAiCrawlers != false
  }
`)
