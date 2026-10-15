import { defineQuery } from 'next-sanity'

import { ctaFields, imageFields, linkFields } from '@/lib/sanity/fragments'

const navItemFields = /* groq */ `
  _key,
  label,
  link { ${linkFields} }
`

/**
 * One query for the announcement bar, header, footer and site metadata: one cache entry, one request per change.
 *
 * The data lives in four singletons (siteIdentity, siteNavigation, announcement, cookieBanner) and
 * is assembled here into the shape the old single "settings" document had (including null when
 * none exists), so components don't change. Until migrations/split-site-settings has run, each part falls back to the old
 * `settings` document, so the site keeps working whether the deploy or the migration comes first.
 * Delete the `settings` fallbacks once the migration has run on every dataset.
 */
export const SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id in ["siteIdentity", "siteNavigation", "announcement", "cookieBanner", "settings"]][0] {
    "identity": coalesce(*[_id == "siteIdentity"][0], *[_id == "settings"][0]) {
      title,
      description,
      logo { ${imageFields} },
      ogImage { asset->{ _id } },
      allowAiCrawlers
    },
    "navigation": coalesce(*[_id == "siteNavigation"][0], *[_id == "settings"][0]) {
      headerNav[] { ${navItemFields} },
      headerCta { ${ctaFields} },
      footerNav[] { ${navItemFields} },
      footerText
    },
    "announcement": coalesce(*[_id == "announcement"][0], *[_id == "settings"][0].announcement) {
      message,
      link { ${linkFields} },
      startsAt,
      endsAt,
      dismissible
    },
    "consent": coalesce(*[_id == "cookieBanner"][0], *[_id == "settings"][0].consent) {
      title,
      message,
      privacyLabel,
      privacyLink { ${linkFields} },
      analyticsText,
      marketingText
    }
  } {
    "title": identity.title,
    "description": identity.description,
    "logo": identity.logo,
    "ogImage": identity.ogImage,
    "announcement": announcement,
    "headerNav": navigation.headerNav,
    "headerCta": navigation.headerCta,
    "footerNav": navigation.footerNav,
    "footerText": navigation.footerText,
    "consent": consent,
    "allowAiCrawlers": identity.allowAiCrawlers != false
  }
`)
