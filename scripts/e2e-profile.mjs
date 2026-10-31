/**
 * The site profile for end-to-end builds. The end-to-end suite tests the template's code against a
 * fake Content Lake, so it must not depend on one client's choices (pre-launch, a feature switched
 * off). With E2E_FIXED_PROFILE=1 the build swaps `site.profile.ts` for the template's default
 * profile (tests/e2e/fixtures/site.profile.ts). Only Playwright and Lighthouse CI set the flag
 * (tests/e2e/constants.ts). Ordinary builds are untouched, and the flag is refused in every Vercel
 * build, Preview and Production alike, so a deployed site can never run on a test profile.
 * Dependency-free: next.config.ts and the unit tests both use it.
 */

/** The import in src/config/profile.ts that the alias replaces. A test keeps the two in step. */
export const PROFILE_SPECIFIER = '../../site.profile'
export const FIXED_PROFILE = './tests/e2e/fixtures/site.profile.ts'

/** Turbopack's `resolveAlias` for this environment: empty unless the flag is set. */
export function e2eProfileAlias(env = process.env) {
  if (env.E2E_FIXED_PROFILE !== '1') return {}
  if (env.VERCEL || env.VERCEL_ENV) {
    throw new Error(
      'E2E_FIXED_PROFILE replaces the site profile with a test profile and is refused in Vercel builds. Remove it from the project settings.',
    )
  }
  return { [PROFILE_SPECIFIER]: FIXED_PROFILE }
}
