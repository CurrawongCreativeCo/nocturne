import type { SiteProfileInput } from './profile'

/**
 * Types the object in `site.profile.ts`. It lives apart from `profile.ts` because that module
 * imports the profile file: this one is only types, so there is no import cycle.
 */
export const defineSiteProfile = (input: SiteProfileInput): SiteProfileInput => input
