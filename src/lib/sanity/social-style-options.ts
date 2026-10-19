import { stegaClean } from 'next-sanity'

/**
 * How a row of social icons is drawn (components/ui/social-links.tsx). `plain` is the original look:
 * bare icons that tint on hover. The shaped styles put each icon on a button of its own, which takes
 * the section's surface, or frosted glass where the section's links are glass. A pill is left out:
 * with no label to hold, it is a stretched circle. Kept free of Studio code so the site can import it.
 */
export const SOCIAL_STYLES = ['plain', 'circle', 'rounded', 'square'] as const
export type SocialStyle = (typeof SOCIAL_STYLES)[number]

export const SOCIAL_STYLE_TITLES: Record<SocialStyle, string> = {
  plain: 'Plain icons',
  circle: 'Circles',
  rounded: 'Rounded squares',
  square: 'Squares',
}

/** Where the icons sit: under the profile (the original place) or after the links. */
export const SOCIAL_POSITIONS = ['above', 'below'] as const
export type SocialPosition = (typeof SOCIAL_POSITIONS)[number]

export const SOCIAL_POSITION_TITLES: Record<SocialPosition, string> = {
  above: 'Above the links',
  below: 'Below the links',
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

export const socialStyleOf = (value: string | null | undefined): SocialStyle =>
  pick(SOCIAL_STYLES, value) ?? 'plain'
export const socialPositionOf = (value: string | null | undefined): SocialPosition =>
  pick(SOCIAL_POSITIONS, value) ?? 'above'
