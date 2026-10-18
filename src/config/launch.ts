import { siteProfile, type LaunchStatus, type SiteProfile, type UnknownPaths } from './profile'

/**
 * The site's launch state: "pre-launch" (a temporary page at `/`, everything else private) or
 * "live". Shared code with no `server-only`, so the proxy, the routes and Studio can all read it.
 *
 * It lives in code, in `site.profile.ts`, never in Sanity: changing it is a reviewed commit and a
 * deployment, because anyone who can edit a document could change a Studio field (README, "Site
 * profile").
 *
 * CACHING RULE: nothing cached may read the launch state. Pages, queries and feeds render the same
 * either way, and `proxy.ts` decides what to serve. A `'use cache'` function or a page that branched
 * on this would bake one state into the cache and show it to the other.
 */

export interface LaunchState {
  status: LaunchStatus
  /** The slug shown at "/" before launch. */
  homepage: string
  /** Other slugs visitors may open before launch. */
  publicPages: string[]
  unknownPaths: UnknownPaths
  /** `[homepage, ...publicPages]`, without repeats: every slug a visitor may open before launch. */
  visibleSlugs: string[]
}

/** The only value of `SITE_LAUNCH_OVERRIDE` that does anything. */
export const LAUNCH_OVERRIDE_VALUE = 'prelaunch'

/**
 * The launch state for a profile.
 *
 * `SITE_LAUNCH_OVERRIDE=prelaunch` turns a live profile into pre-launch (the e2e server that tests the
 * gate, and an emergency "hide the site now" that needs no commit). It can only HIDE. Any other value,
 * including `live`, is ignored with a console warning: an environment variable is set outside code
 * review, so it must never be able to reveal a site the profile says is private.
 */
export function getLaunchState(
  profile: Pick<SiteProfile, 'launch'> = siteProfile,
  env: Record<string, string | undefined> = process.env,
): LaunchState {
  const override = env.SITE_LAUNCH_OVERRIDE
  if (override !== undefined && override !== '' && override !== LAUNCH_OVERRIDE_VALUE) {
    console.warn(
      `SITE_LAUNCH_OVERRIDE=${JSON.stringify(override)} is ignored: the only value it accepts is "${LAUNCH_OVERRIDE_VALUE}" (it can hide a site, never reveal one). Change the launch status in site.profile.ts.`,
    )
  }

  const { homepage, publicPages, unknownPaths } = profile.launch
  return {
    status: override === LAUNCH_OVERRIDE_VALUE ? 'prelaunch' : profile.launch.status,
    homepage,
    publicPages: [...publicPages],
    unknownPaths,
    visibleSlugs: [...new Set([homepage, ...publicPages])],
  }
}

/**
 * Whether a visitor may open the page at `pathname` right now. Live: always. Pre-launch: `/` (it shows
 * the temporary page) and the pages in `visibleSlugs`, matched exactly: `/links` and `/links/` are the
 * same page, but `/links/more` (a page under it), `/LINKS` (slugs are lowercase, so it is not a page
 * to show) and `//links` are not. For page paths: routes that are not pages (`/api`, `/studio`,
 * `/_next`) are the proxy's to classify. A query string or hash is not part of a pathname.
 */
export function isPublicBeforeLaunch(
  pathname: string,
  state: Pick<LaunchState, 'status' | 'visibleSlugs'>,
): boolean {
  if (state.status === 'live') return true
  if (pathname === '/') return true
  if (!pathname.startsWith('/')) return false
  const slug = pathname.slice(1).replace(/\/$/, '')
  return slug !== '' && state.visibleSlugs.includes(slug)
}
