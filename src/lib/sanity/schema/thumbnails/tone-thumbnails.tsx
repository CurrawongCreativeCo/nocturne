import { colorHex } from '@/config/tokens.generated'

import type { SECTION_TONES } from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

type SectionTone = (typeof SECTION_TONES)[number]

interface ToneColours {
  background: string
  text: string
  muted: string
  button: string
  buttonText: string
}

/**
 * Tones are not pictures: each swatch is the section's own background and text colours, read from
 * the site's design tokens (`tokens.json`), so a re-skinned site shows its real colours here. These
 * are the site's colours on purpose, not the Studio theme's, so they do not change with light and
 * dark.
 */
const TONES: Record<SectionTone, ToneColours> = {
  surface: {
    background: colorHex.surface,
    text: colorHex.ink,
    muted: colorHex.inkMuted,
    button: colorHex.accent,
    buttonText: colorHex.accentInk,
  },
  alt: {
    background: colorHex.surfaceAlt,
    text: colorHex.ink,
    muted: colorHex.inkMuted,
    button: colorHex.accent,
    buttonText: colorHex.accentInk,
  },
  inverse: {
    background: colorHex.surfaceInverse,
    text: colorHex.inkInverse,
    muted: colorHex.inkInverseMuted,
    // Mirrors the [data-tone='inverse'] rule in tokens.generated.css.
    button: `color-mix(in oklab, ${colorHex.accent} 55%, ${colorHex.inkInverse})`,
    buttonText: colorHex.surfaceInverse,
  },
  accent: {
    background: colorHex.accent,
    text: colorHex.accentInk,
    muted: colorHex.accentInk,
    button: colorHex.accentInk,
    buttonText: colorHex.accent,
  },
}

function ToneThumbnail({ tone }: { tone: SectionTone }) {
  const { background, text, muted, button, buttonText } = TONES[tone]
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`tone-${tone}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={background} />
      <rect x={32} y={34} width={96} height={9} rx={2} fill={text} />
      <rect x={48} y={48} width={64} height={9} rx={2} fill={text} />
      <rect x={40} y={66} width={80} height={3} rx={1.5} fill={muted} opacity={0.8} />
      <rect x={48} y={72} width={64} height={3} rx={1.5} fill={muted} opacity={0.8} />
      <rect x={59} y={86} width={42} height={12} rx={6} fill={button} />
      <rect x={69} y={90.5} width={22} height={3} rx={1.5} fill={buttonText} />
    </svg>
  )
}

export const ToneSurfaceThumbnail = (_props: PresetThumbnailProps) => (
  <ToneThumbnail tone="surface" />
)
export const ToneAltThumbnail = (_props: PresetThumbnailProps) => <ToneThumbnail tone="alt" />
export const ToneInverseThumbnail = (_props: PresetThumbnailProps) => (
  <ToneThumbnail tone="inverse" />
)
export const ToneAccentThumbnail = (_props: PresetThumbnailProps) => <ToneThumbnail tone="accent" />
