import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { SocialIcon } from '@/components/ui/social-icon'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import { OWN_SHADOW, type BoxDepth } from '@/lib/sanity/depth-options'
import { SHAPE_RADIUS, type SocialStyle } from '@/lib/sanity/social-style-options'
import { glassSurfaceLook, ringSurfaceLook, type SurfaceDesign } from '@/lib/sanity/surface-options'
import { socialPlatformTitle } from '@/lib/social-platforms'

export interface SocialProfile {
  _key: string
  platform?: string | null
  url?: string | null
}

// Full class names, so Tailwind's scanner sees them. Every style keeps a 44 px target (size-11).
const BASE =
  'inline-flex size-11 items-center justify-center transition-colors duration-(--duration-fast) motion-reduce:transition-none'
const PLAIN = 'rounded-button text-ink-muted hover:bg-surface-alt hover:text-ink'
// A solid button's fill and border, which a chosen design replaces one property at a time.
const SOLID_FILL = 'bg-surface hover:bg-surface-alt'
const SOLID_BORDER = 'ring-1 ring-inset ring-line'
// The frosted surface of Glass rows (`.glass-row` in globals.css), so icons and rows match.
const GLASS = 'glass-row text-ink'
const GLASS_STRENGTH: Record<GlassStrength, string> = {
  light: 'glass-row-light',
  medium: '',
  strong: 'glass-row-strong',
}

/** The classes for one icon link, so other components can draw a matching single icon. */
export function socialLinkClass(
  shape: SocialStyle,
  surface: 'solid' | 'glass' = 'solid',
  strength: GlassStrength = 'medium',
  /** The shadow this button draws on its own; none when the caller supplies depth. */
  shadow: (typeof OWN_SHADOW)[keyof typeof OWN_SHADOW] = OWN_SHADOW.card,
  surfaceLook?: Pick<ReturnType<typeof ringSurfaceLook>, 'className'>,
): string {
  if (shape === 'plain') return `${BASE} ${PLAIN}`
  const look =
    surface === 'glass'
      ? `${GLASS} ${GLASS_STRENGTH[strength]}`
      : `${surfaceLook?.className ?? `${SOLID_FILL} ${SOLID_BORDER}`} text-ink${shadow === OWN_SHADOW.card ? ' shadow-card' : ''}`
  return `${BASE} ${look} ${SHAPE_RADIUS[shape]}`.trim()
}

/**
 * A labelled list of social profile links, one icon each. Each link is named for its network
 * ("Instagram"), takes `rel="me"` (it is this person's or business's profile) and wraps onto more
 * lines on a narrow screen. `colour` is a CSS colour from the theme-colour field. `design` changes
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
  depth,
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
  /** Design › Depth and glow for the shaped buttons, given the shadow a button draws on its own. */
  depth?: BoxDepth
}) {
  const links = profiles.filter((profile) => profile.url)
  if (links.length === 0) return null
  // Plain icons have no button to fill, outline or lift.
  const look =
    shape === 'plain'
      ? undefined
      : surface === 'glass'
        ? glassSurfaceLook(design, { strength: strength ?? 'medium' })
        : ringSurfaceLook(design, { background: SOLID_FILL, border: SOLID_BORDER })
  // Glass buttons draw the glass's shadow, solid ones the card's.
  const lift =
    shape === 'plain' ? undefined : depth?.(OWN_SHADOW[surface === 'glass' ? 'glass' : 'card'])
  const style: CSSProperties | undefined =
    colour || look?.style || lift ? { color: colour, ...look?.style, ...lift?.style } : undefined
  const linkClass = socialLinkClass(
    shape,
    surface,
    strength,
    lift ? OWN_SHADOW.none : OWN_SHADOW.card,
    look,
  )

  return (
    <nav aria-label={label}>
      <ul
        className={`flex flex-wrap ${shape === 'plain' ? 'gap-1' : 'gap-3'} ${className}`.trim()}
        data-social-style={shape}
      >
        {links.map((profile) => {
          const platform = stegaClean(profile.platform) ?? ''
          return (
            <li key={profile._key}>
              <a
                href={stegaClean(profile.url) ?? undefined}
                rel="me"
                aria-label={socialPlatformTitle(platform)}
                className={lift ? `${linkClass} ${lift.className}` : linkClass}
                style={style}
              >
                <SocialIcon platform={platform} />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
