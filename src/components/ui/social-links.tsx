import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { SocialIcon } from '@/components/ui/social-icon'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import type { SocialStyle } from '@/lib/sanity/social-style-options'
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
const SOLID = 'bg-surface text-ink shadow-card ring-1 ring-inset ring-line hover:bg-surface-alt'
// The frosted surface of Glass rows (`.glass-row` in globals.css), so icons and rows match.
const GLASS = 'glass-row text-ink'
const GLASS_STRENGTH: Record<GlassStrength, string> = {
  light: 'glass-row-light',
  medium: '',
  strong: 'glass-row-strong',
}
const RADIUS: Record<Exclude<SocialStyle, 'plain'>, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-control',
  square: 'rounded-sm',
}

/** The classes for one icon link, so other components can draw a matching single icon. */
export function socialLinkClass(
  shape: SocialStyle,
  surface: 'solid' | 'glass' = 'solid',
  strength: GlassStrength = 'medium',
): string {
  if (shape === 'plain') return `${BASE} ${PLAIN}`
  const look = surface === 'glass' ? `${GLASS} ${GLASS_STRENGTH[strength]}` : SOLID
  return `${BASE} ${look} ${RADIUS[shape]}`.trim()
}

/**
 * A labelled list of social profile links, one icon each. Each link is named for its network
 * ("Instagram"), takes `rel="me"` (it is this person's or business's profile) and wraps onto more
 * lines on a narrow screen. `colour` and `background` are CSS colours from the theme-colour field;
 * the background only applies to the shaped styles, and never to glass, which must stay see-through.
 */
export function SocialLinks({
  profiles,
  shape = 'plain',
  surface = 'solid',
  strength,
  colour,
  background,
  className = '',
  label = 'Social profiles',
}: {
  profiles: readonly SocialProfile[]
  shape?: SocialStyle
  surface?: 'solid' | 'glass'
  strength?: GlassStrength
  colour?: string
  background?: string
  /** Classes for the list: spacing and justification. */
  className?: string
  label?: string
}) {
  const links = profiles.filter((profile) => profile.url)
  if (links.length === 0) return null
  const solidButton = shape !== 'plain' && surface !== 'glass'
  const backgroundColor = solidButton ? background : undefined
  const style: CSSProperties | undefined =
    colour || backgroundColor ? { color: colour, backgroundColor } : undefined

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
                className={socialLinkClass(shape, surface, strength)}
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
