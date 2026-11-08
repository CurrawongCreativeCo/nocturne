import { stegaClean } from 'next-sanity'

import { ICON_BOX_TOUCH, IconContainer } from '@/components/ui/icon-container'
import { SocialIcon } from '@/components/ui/social-icon'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import { OWN_SHADOW, type BoxDepth } from '@/lib/sanity/depth-options'
import type { SocialStyle } from '@/lib/sanity/social-style-options'
import type { IconDesign, OwnIcon, SurfaceDesign } from '@/lib/sanity/surface-options'
import { socialPlatformTitle } from '@/lib/social-platforms'

export interface SocialProfile {
  _key: string
  platform?: string | null
  url?: string | null
}

// Full class names, so Tailwind's scanner sees them. Every style keeps a 44 px target (size-11).
const BASE =
  'inline-flex items-center justify-center transition-colors duration-(--duration-fast) motion-reduce:transition-none'
const PLAIN = 'rounded-button text-ink-muted hover:bg-surface-alt hover:text-ink'
// A solid button's fill and border, which a chosen design replaces one property at a time.
const SOLID_FILL = 'bg-surface hover:bg-surface-alt'
const SOLID_BORDER = 'ring-1 ring-inset ring-line'
const OWN: OwnIcon = {
  shape: 'circle',
  background: SOLID_FILL,
  border: SOLID_BORDER,
  colour: 'text-ink',
  fill: 'var(--color-surface)',
}

/**
 * A labelled list of social profile links, one icon each. Each link is named for its network
 * ("Instagram") or by `linkLabel`, takes `rel="me"` unless `rel` says otherwise (the default is for
 * the site's own profiles; someone else's, such as a team member's, passes `noopener`) and wraps onto
 * more lines on a narrow screen. `colour` is a CSS colour from the theme-colour field. `design` changes
 * the shaped buttons' fill, strength and border one property at a time (lib/sanity/surface-options.ts):
 * on glass it tints the glass and keeps the blur, the same way Glass rows are tinted.
 */
export function SocialLinks({
  profiles,
  shape = 'plain',
  surface = 'solid',
  strength,
  colour,
  design = {},
  className = '',
  label = 'Social profiles',
  labelledBy,
  depth,
  rel = 'me',
  linkLabel,
}: {
  profiles: readonly SocialProfile[]
  shape?: SocialStyle
  surface?: 'solid' | 'glass'
  strength?: GlassStrength
  colour?: string
  /** The shaped buttons' fill and border; unset properties keep the style's own. */
  design?: SurfaceDesign
  /** Classes for the list: spacing and justification. */
  className?: string
  label?: string
  labelledBy?: string
  /** Design › Depth and glow for the shaped buttons, given the shadow a button draws on its own. */
  depth?: BoxDepth
  /** The links' `rel`. `me` claims the profile as the site's own, so only pass it for those. */
  rel?: string
  /** A link's accessible name, given its network title ("Jo Lee on Instagram"). */
  linkLabel?: (networkTitle: string) => string
}) {
  const links = profiles.filter((profile) => profile.url)
  if (links.length === 0) return null
  // Glass buttons draw the glass's shadow, solid ones the card's. Plain icons have no button to lift.
  const lift =
    shape === 'plain' ? undefined : depth?.(OWN_SHADOW[surface === 'glass' ? 'glass' : 'card'])
  const own: OwnIcon = { ...OWN, shape, colour: shape === 'plain' ? undefined : OWN.colour }
  const iconDesign: IconDesign = { ...design, shape, ...(colour ? { colour } : {}) }
  const shadow = lift
    ? lift.className
    : shape !== 'plain' && surface === 'solid'
      ? 'shadow-card'
      : ''

  return (
    <nav aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
      <ul
        className={`flex flex-wrap ${shape === 'plain' ? 'gap-1' : 'gap-3'} ${className}`.trim()}
        data-social-style={shape}
      >
        {links.map((profile) => {
          const platform = stegaClean(profile.platform) ?? ''
          const title = socialPlatformTitle(platform)
          return (
            <li key={profile._key}>
              <IconContainer
                as="a"
                href={stegaClean(profile.url) ?? undefined}
                rel={rel}
                aria-label={linkLabel ? linkLabel(title) : title}
                design={iconDesign}
                own={own}
                surface={surface}
                strength={strength}
                size={ICON_BOX_TOUCH}
                base={BASE}
                plainClassName={PLAIN}
                className={shadow}
                style={lift?.style}
              >
                <SocialIcon platform={platform} />
              </IconContainer>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
