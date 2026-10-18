import { defineSiteProfile } from './src/config/define-site-profile'

/**
 * What this site uses (a Customize file: edit it per client). Studio, the routes and `/api/site-info`
 * read it through `src/config/profile.ts`. A feature left out stays on; a feature set to false
 * answers 404 on the public site and disappears from the Studio. See "Site profile" in the README.
 */
export const siteProfileInput = defineSiteProfile({
  client: { name: 'Currawong Creative', slug: 'currawong-creative' },
  tier: 'custom',
  features: {
    blog: true,
    forms: true,
    newsletter: true,
    pricing: true,
    members: true,
    experiments: true,
    search: true,
    businessInfo: true,
    team: true,
    teamProfiles: true,
    events: true,
  },
  // Left out, the site is live. Before launch: a temporary page at "/" and everything else private.
  // Changing this is a reviewed commit and a deployment; Studio cannot change it. See "Site profile".
  // launch: { status: 'prelaunch', homepage: 'links', publicPages: [], unknownPaths: 'not-found' },
  // Section types clients may add. Empty: the Studio's default list (see DEFAULT_CLIENT_SECTIONS).
  clientSections: [],
  help: {
    // guideUrl: 'https://example.com/guide',
    // supportEmail: 'support@example.com', // shown under "Ask Currawong" in Start here
    // videos: { 'edit-a-page': 'https://example.com/videos/edit-a-page' },
  },
})
