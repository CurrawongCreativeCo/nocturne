import { type Features, siteProfile } from '@/config/profile'

/**
 * The Studio's Releases settings for a set of feature switches. Releases and scheduled drafts are
 * one paid Sanity feature with two doors: with Releases off but scheduled drafts on, Studio still
 * shows the same tool (renamed "Scheduled Drafts"), which opens an upgrade screen on other plans.
 * So both go together. Variants (A/B tests) have their own switch (`beta.variants`) and are unaffected.
 */
export function releasesSettings(features: Pick<Features, 'releases'>) {
  const enabled = features.releases
  return { releases: { enabled }, scheduledDrafts: { enabled } }
}

export const studioReleasesSettings = releasesSettings(siteProfile.features)
