/**
 * The words on Website settings → Features & setup (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md,
 * §C.2 and §C.7). Plain Australian English, naming the exact place to look and never blaming the
 * person or the deployment. Pure, so the wording is unit tested.
 */

export const SETUP_TITLE = 'Features & setup'

export const SETUP_FOOTER = 'Changes to these settings apply after the next deployment.'

export const REDEPLOY_STEP = 'Redeploy, then reopen this pane.'

/** Shown when the pane can't say what is set up, in place of any status. */
export const CHECK_READINESS = 'Check readiness with `npm run config:check` or Foundation.'

/** Why there is no status, by the way the route (or the browser) answered. */
export const EXPLANATIONS_ONLY_REASON = {
  'no-token':
    "Studio signed you in with a cookie, so it can't prove to the site who you are from here.",
  refused: "The site didn't accept your sign-in for this check.",
  missing: "This site doesn't offer a status check.",
  'separate-host':
    "Studio isn't running inside the website here, so it can't ask the site what is set up.",
} as const

export const COULDNT_LOAD =
  "Couldn't load the setup status. Your settings are unchanged. Try again in a moment."

export const AGENCY_ONLY =
  'Features & setup is for Currawong. Your site settings are in the other screens.'

/** Registry settings that live in GitHub, which Studio can't see. */
export const CANT_CHECK_GITHUB =
  "Studio can't see GitHub. Check the Actions tab of the repository, or run `npm run config:check -- --github`."

export const CANT_CHECK_OTHER =
  "This can't be checked from here. Run `npm run config:check`, or open Foundation."

export const SETTING_WHERE = {
  vercel: 'Vercel → Settings → Environment Variables',
  github: 'GitHub → repository settings',
  sanity: 'Sanity',
  'site.profile.ts': 'site.profile.ts',
  local: '.env.local on your machine',
} as const

export const STATUS_LABEL = {
  attention: 'Not set up',
  ready: 'Ready',
  'cant-check': "Can't be checked from here",
  'not-in-use': 'Not in use',
  off: "Off in this site's profile",
} as const

export const GROUP_TITLE = {
  attention: 'Needs attention',
  'cant-check': "Can't be checked from here",
  ready: 'Ready',
  'not-in-use': 'Not in use',
  off: "Off in this site's profile",
} as const

/** Start here's line for agency staff, or null when nothing needs setting up. */
export function featuresNeedSetupLine(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? '1 feature needs setup' : `${count} features need setup`
}

/** "26 Oct 2026, 9:14 am AEDT": the build time as the agency reads it. */
export function formatBuildTime(iso: string | null, timeZone = 'Australia/Sydney'): string {
  if (!iso) return 'build time not recorded'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'build time not recorded'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date)
}

/** "This deployment: abc1234 · 26 Oct 2026, 9:14 am AEDT". */
export function deploymentHeader(commit: string | null, builtAt: string | null): string {
  const short = commit ? commit.slice(0, 7) : 'commit not recorded'
  return `This deployment: ${short} · ${formatBuildTime(builtAt)}`
}

/** The pane was built without the registry text (an older sanity.config.ts). */
export const NO_FEATURE_LIST =
  "Studio wasn't given the feature list. Pass `featureRegistry` to `createStructure` in sanity.config.ts (see the README, Features & setup)."
