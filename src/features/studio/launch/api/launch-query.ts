/**
 * What the Launch & visibility screen needs, in one request, with the `raw` perspective so drafts
 * come back beside published documents (the checklist counts only published ones). Pages are
 * fetched whole because menu links and the leftover note are found by walking them, as Start here
 * does. Nothing secret is read.
 */
export const LAUNCH_QUERY = `{
  "pages": *[_type == "page"] {
    _id,
    title,
    "slug": slug.current,
    "description": seo.metaDescription,
    "ogImage": seo.ogImage.asset._ref,
    pageBuilder
  },
  "navigation": *[_id in ["siteNavigation", "drafts.siteNavigation"]] {
    _id,
    headerNav,
    headerCta,
    footerNav
  },
  "identity": *[_id in ["siteIdentity", "drafts.siteIdentity"]] {
    _id,
    description,
    "ogImage": ogImage.asset._ref,
    "logo": logo.asset._ref,
    "browserIcon": browserIcon { choice, "image": image.asset._ref }
  },
  "business": *[_id in ["businessInfo", "drafts.businessInfo"]] {
    _id,
    phone,
    publicEmail,
    "socialCount": count(socialLinks)
  }
}`

/** Types whose changes can change the answer, so the screen listens for them. */
export const LAUNCH_LISTEN_FILTER =
  '_type in ["page", "siteNavigation", "siteIdentity", "businessInfo"]'
