import { defineQuery } from 'next-sanity'

/**
 * Full-text search over published pages. `$q` is a `match` pattern built by `toMatchPattern`
 * (each word a prefix), never raw visitor text. Pages hidden from search engines are left out.
 *
 * A page matches on its title, meta description or the text of its rich-text and image + text
 * sections (the sections with a `body`); a title match ranks first. `text` is the matched body
 * text, which the server turns into a short snippet; it never reaches the browser as is.
 * To search more fields, add them to the `match` and to the projection.
 */
export const SEARCH_QUERY = defineQuery(/* groq */ `
  *[
    _type == "page" && defined(slug.current) && seo.noIndex != true &&
    (title match $q || seo.metaDescription match $q || pt::text(pageBuilder[].body) match $q)
  ] | score(title match $q) | order(_score desc, title asc) [0...20] {
    title,
    "slug": slug.current,
    "description": seo.metaDescription,
    "text": coalesce(pt::text(pageBuilder[].body), "")
  }
`)
