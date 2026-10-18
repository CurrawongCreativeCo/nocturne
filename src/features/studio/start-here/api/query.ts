import { defineQuery } from 'next-sanity'

/**
 * Everything the Start here tool needs, in one request. Run with the `raw` perspective so drafts
 * come back beside published documents. `recent` is a generous slice of the newest documents
 * (a document and its draft are two rows, and some types are filtered out in the browser).
 * Pages and shared sections are fetched whole because links and images are found by walking them.
 * `enquiries` are two counts, never the enquiries themselves: they hold personal details.
 */
export const START_HERE_QUERY = defineQuery(/* groq */ `{
  "recent": *[!(_type match "system.**") && !(_type match "sanity.**") && !(_type match "assist.**")]
    | order(_updatedAt desc)[0...60] {
      _id,
      _type,
      _updatedAt,
      "title": coalesce(title, name)
    },
  "drafts": *[_id in path("drafts.**") && !(_type match "sanity.**") && !(_type match "assist.**")]
    | order(_updatedAt asc)[0...200] {
      _id,
      _type,
      _updatedAt,
      "title": coalesce(title, name)
    },
  "pages": *[_type == "page"] {
    _id,
    title,
    "slug": slug.current,
    pageBuilder
  },
  "sharedSections": *[_type == "sharedSection"] {
    _id,
    title,
    section
  },
  "enquiries": {
    "new": count(*[_type == "enquiry" && status == "new"]),
    "total": count(*[_type == "enquiry"])
  },
  "navigation": *[_id in ["siteNavigation", "drafts.siteNavigation"]] {
    _id,
    headerNav,
    headerCta,
    footerNav
  }
}`)
