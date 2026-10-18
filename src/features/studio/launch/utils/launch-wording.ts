import type { Audience } from '../../roles'

/**
 * The words on the Launch & visibility screen and Start here's banner. Plain sentences for clients;
 * the state itself lives in `site.profile.ts` and is only ever shown here (README, "Launch state").
 */

export interface LaunchWordingInput {
  status: 'prelaunch' | 'live'
  /** The temporary page's title, e.g. "Links". */
  homepageTitle: string
  /** The address visitors use, without the scheme: "example.com.au". */
  domain: string
}

/** The agency's one-line status. */
export function statusLine({ status, homepageTitle }: LaunchWordingInput): string {
  return status === 'prelaunch' ? `Pre-launch: visitors see ${homepageTitle} at /` : 'Live'
}

/** What the client reads: one sentence, no jargon. */
export function clientSentence({ status, domain }: LaunchWordingInput): string {
  return status === 'prelaunch'
    ? `Your website is in pre-launch. Visitors see your Link page at ${domain}. Currawong will launch the full site.`
    : 'Your website is live.'
}

/** Start here's banner, shown before launch to everyone; nothing once live. */
export function launchBanner(input: LaunchWordingInput): string | null {
  return input.status === 'prelaunch' ? clientSentence(input) : null
}

/** The scheme and trailing slash dropped from a site address. */
export function domainOf(siteUrl: string): string {
  try {
    return new URL(siteUrl).host
  } catch {
    return siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export const DOMAINS_NOTE = 'Domains are managed by Currawong.'

/** The three plain steps under "How to launch". */
export function launchSteps(domain: string): string[] {
  return [
    'Finish the checklist above, then open “Preview the full site” and look through every page.',
    `Open a pull request that sets launch.status to 'live' in site.profile.ts. On its preview, run: npm run launch:check -- <preview address> --bypass --expect-origin=https://${domain}`,
    `Merge it. When it has deployed, run: npm run launch:check -- https://${domain}`,
  ]
}

/** Which of the two views a person gets. Only agency staff see the checklist and the preview links. */
export const seesChecklist = (audience: Audience) => audience === 'agency'

export const README_LAUNCH_URL =
  'https://github.com/CurrawongCreativeCo/nocturne#pre-launch-and-launch'
