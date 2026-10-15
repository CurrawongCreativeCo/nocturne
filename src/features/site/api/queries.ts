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
 * The data lives in five singletons (siteIdentity, siteNavigation, announcement, cookieBanner, designSettings) and
 * is assembled here into the shape the old single "settings" document had (including null when
 * none exists), so components don't change. Until migrations/split-site-settings has run, each part falls back to the old
 * `settings` document, so the site keeps working whether the deploy or the migration comes first.
 * Delete the `settings` fallbacks once the migration has run on every dataset.
 */
export const SETTINGS_QUERY = defineQuery(/* groq */ `
  *[_id in ["siteIdentity", "siteNavigation", "announcement", "cookieBanner", "designSettings", "settings"]][0] {
    "identity": coalesce(*[_id == "siteIdentity"][0], *[_id == "settings"][0]) {
      title,
      description,
      logo { ${imageFields} },
      ogImage { asset->{ _id } },
      // Only when the editor chose their own icon: the default icon needs no data.
      "browserIcon": select(
        browserIcon.choice in ["upload", "logo"] && defined(browserIcon.image.asset) => {
          "image": browserIcon.image { asset, crop, hotspot },
          "padding": coalesce(browserIcon.padding, "none"),
          "background": coalesce(browserIcon.background, "transparent")
        }
      ),
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
    },
    // Brand colours and gradients (resolveDesignTokens turns them into CSS variables in SiteShell).
    "design": *[_id == "designSettings"][0] {
      appearance,
      primary,
      secondary,
      highlight,
      surface,
      surfaceAlt,
      surfaceInverse,
      ink,
      inkMuted,
      line,
      gradients[] { name, angle, stops }
    }
  } {
    "title": identity.title,
    "description": identity.description,
    "logo": identity.logo,
    "ogImage": identity.ogImage,
    "browserIcon": identity.browserIcon,
    "announcement": announcement,
    "headerNav": navigation.headerNav,
    "headerCta": navigation.headerCta,
    "footerNav": navigation.footerNav,
    "footerText": navigation.footerText,
    "consent": consent,
    "design": design,
    "allowAiCrawlers": identity.allowAiCrawlers != false
  }
`)
