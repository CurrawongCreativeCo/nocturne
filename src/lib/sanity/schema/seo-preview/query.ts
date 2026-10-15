import { defineQuery } from 'next-sanity'

/** What the SEO preview falls back to, like `getSiteMetadata` does on the site. */
export const SEO_PREVIEW_SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id == "siteIdentity"][0] { title, description, ogImage }
`)
