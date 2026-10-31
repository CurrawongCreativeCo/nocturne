import { defineSiteProfile } from '../../../src/config/define-site-profile'

/**
 * What this site uses (a Customize file: edit it per client). Studio, the routes and `/api/site-info`
 * read it through `src/config/profile.ts`. A feature left out stays on (except `releases`, which follows the Sanity plan and starts off); a feature set to false
 * answers 404 on the public site and disappears from the Studio. See "Site profile" in the README.
 */
export const siteProfileInput = defineSiteProfile({
  client: { name: 'Currawong Creative', slug: 'currawong-creative' },
  voice: {
    summary:
      'A thoughtful Australian creative agency: warm, clear and quietly confident. Help business owners understand their options and take the next step.',
    do: [
      'Speak directly to the reader using plain Australian English.',
      'Use active verbs and concrete examples to explain the value of our work.',
      'Keep sentences concise and advice practical.',
    ],
    dont: [
      'Use hype, corporate jargon or pushy sales language.',
      'Invent results, testimonials or guarantees.',
      'Use American spelling or forced Australian slang.',
    ],
  },
  tier: 'custom',
  features: {
    blog: true,
    // forms, newsletter, pricing, members and experiments need a service behind them. Left out they
    // are on, as before, but `config:check` treats them as "not in use" until something is set for
    // them. Write `forms: true` (and so on) to declare that this site uses one: then a missing
    // setting is a gap `config:check --strict` fails on. Write `false` to switch it off.
    search: true,
    businessInfo: true,
    team: true,
    teamProfiles: true,
    events: true,
    // The one difference from site.profile.ts: Services are off by default there, and the suite tests them (task 192).
    services: true,
    locations: true,
    // Sanity Releases and scheduled drafts: on only where the Sanity plan includes them (default off).
    releases: true,
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
