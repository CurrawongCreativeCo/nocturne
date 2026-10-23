export interface SupportHelp {
  guideUrl?: string
  supportEmail?: string
}

/** The in-Studio Help section on Start here: where the fallback advice lives. */
export const HELP_SECTION_HREF = '#start-here-help'

/**
 * The one place editors are sent for help: the support address, else the guide, else the Help
 * section on Start here. Error messages and dialogs link this, so they never disagree.
 */
export function supportRoute({ guideUrl, supportEmail }: SupportHelp): {
  href: string
  external: boolean
} {
  if (supportEmail) return { href: `mailto:${supportEmail}`, external: true }
  if (guideUrl) return { href: guideUrl, external: true }
  return { href: HELP_SECTION_HREF, external: false }
}

/** What to say when there is no address or guide: who to ask and what to include. */
export function helpFallbackWording(studioName: string): { heading: string; body: string } {
  return {
    heading: `Ask the ${studioName} team`,
    body: `Contact the ${studioName} team and tell them the name of the page you were on and what you were trying to do. A screenshot of what you can see helps a lot.`,
  }
}
