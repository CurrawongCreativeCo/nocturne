import { defineQuery } from 'next-sanity'

/**
 * Everything the Content health tool needs, in one request. Run with the `raw` perspective so
 * drafts come back beside published documents (`resolveVersions` pairs them up). Page content is
 * fetched whole because links and images are found by walking it.
 */
export const CONTENT_HEALTH_QUERY = defineQuery(/* groq */ `{
  "pages": *[_type == "page"] {
    _id,
    title,
    "slug": slug.current,
    "metaDescription": seo.metaDescription,
    pageBuilder
  },
  "sharedSections": *[_type == "sharedSection"] {
    _id,
    title,
    section
  },
  "panels": *[_type == "panel"] {
    _id,
    title
  },
  "navigation": *[_id in ["siteNavigation", "drafts.siteNavigation"]] {
    _id,
    headerNav,
    headerCta,
    footerNav
  },
  "redirects": *[_type == "redirect"] {
    _id,
    source,
    destination
  }
}`)
