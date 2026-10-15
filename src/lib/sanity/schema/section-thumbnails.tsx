import tokens from '@/styles/tokens.json'

import type { PresetThumbnailProps } from './preset-field'

/**
 * Pictures for the Design tab's pickers. Backgrounds are drawn with the site's real token colours
 * (src/styles/tokens.json), so a change to the palette shows here too. These preview the public
 * site, not the Studio, so they ignore the Studio's light and dark scheme.
 */

const { color } = tokens

interface ToneColours {
  background: string
  ink: string
  muted: string
  button: string
  buttonInk: string
}

// Mirrors the [data-tone] rules in tokens.generated.css.
const TONES: Record<'surface' | 'alt' | 'inverse' | 'accent', ToneColours> = {
  surface: {
    background: color.surface.hex,
    ink: color.ink.hex,
    muted: color['ink-muted'].hex,
    button: color.accent.hex,
    buttonInk: color['accent-ink'].hex,
  },
  alt: {
    background: color['surface-alt'].hex,
    ink: color.ink.hex,
    muted: color['ink-muted'].hex,
    button: color.accent.hex,
    buttonInk: color['accent-ink'].hex,
  },
  inverse: {
    background: color['surface-inverse'].hex,
    ink: color['ink-inverse'].hex,
    muted: color['ink-inverse-muted'].hex,
    button: `color-mix(in oklab, ${color.accent.hex} 55%, ${color['ink-inverse'].hex})`,
    buttonInk: color['surface-inverse'].hex,
  },
  accent: {
    background: color.accent.hex,
    ink: color['accent-ink'].hex,
    muted: color['accent-ink'].hex,
    button: color['accent-ink'].hex,
    buttonInk: color.accent.hex,
  },
}

function ToneSwatch({ tone }: { tone: keyof typeof TONES }) {
  const c = TONES[tone]
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true">
      <rect width={120} height={90} fill={c.background} />
      <rect x={14} y={20} width={70} height={9} rx={3} fill={c.ink} />
      <rect x={14} y={36} width={54} height={5} rx={2.5} fill={c.muted} opacity={0.8} />
      <rect x={14} y={46} width={44} height={5} rx={2.5} fill={c.muted} opacity={0.8} />
      <rect x={14} y={62} width={30} height={12} rx={6} fill={c.button} />
      <rect x={20} y={66} width={18} height={4} rx={2} fill={c.buttonInk} />
      {/* A hairline, so the page-coloured swatch is visible on a white Studio. */}
      <rect width={120} height={90} fill="none" stroke="currentColor" opacity={0.25} />
    </svg>
  )
}

export const SurfaceSwatch = () => <ToneSwatch tone="surface" />
export const SoftSwatch = () => <ToneSwatch tone="alt" />
export const DarkSwatch = () => <ToneSwatch tone="inverse" />
export const AccentSwatch = () => <ToneSwatch tone="accent" />

/** Rows of text bars; a row's `opacity` fades it. */
function Bars({
  selected,
  rows,
}: PresetThumbnailProps & { rows: { y: number; width: number; opacity?: number }[] }) {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true">
      {rows.map(({ y, width, opacity = 1 }) => (
        <rect
          key={y}
          x={(120 - width) / 2}
          y={y}
          width={width}
          height={10}
          rx={3}
          fill="currentColor"
          opacity={(selected ? 0.9 : 0.55) * opacity}
        />
      ))}
    </svg>
  )
}

export const MotionNone = (props: PresetThumbnailProps) => (
  <Bars
    {...props}
    rows={[
      { y: 18, width: 70 },
      { y: 38, width: 90 },
      { y: 58, width: 56 },
    ]}
  />
)

// Fading in: the lower the bar, the fainter and further from its place.
export const MotionReveal = (props: PresetThumbnailProps) => (
  <Bars
    {...props}
    rows={[
      { y: 14, width: 70 },
      { y: 36, width: 90, opacity: 0.6 },
      { y: 62, width: 56, opacity: 0.3 },
    ]}
  />
)

// One after another: each bar starts further along.
export const MotionStagger = ({ selected }: PresetThumbnailProps) => (
  <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true">
    {[0, 1, 2].map((index) => (
      <rect
        key={index}
        x={14 + index * 14}
        y={18 + index * 20}
        width={70}
        height={10}
        rx={3}
        fill="currentColor"
        opacity={selected ? 0.9 : 0.55}
      />
    ))}
  </svg>
)

// A picture drifting inside its frame.
export const MotionParallax = ({ selected }: PresetThumbnailProps) => (
  <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true">
    <rect
      x={26}
      y={10}
      width={68}
      height={70}
      rx={4}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      opacity={0.5}
    />
    <rect
      x={32}
      y={34}
      width={56}
      height={40}
      rx={3}
      fill="currentColor"
      opacity={selected ? 0.9 : 0.55}
    />
  </svg>
)
