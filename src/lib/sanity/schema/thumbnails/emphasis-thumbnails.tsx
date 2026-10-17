import type { HeadingGradient } from '@/config/heading-gradients'
import { colorHex } from '@/config/tokens.generated'

import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Wireframe } from './wireframe'

/**
 * Pictures for the heading emphasis pickers: a two-word heading with one word treated. Like every
 * wireframe they draw with the Studio's Card variables, so they follow the CMS brand.
 */

const ACCENT = 'var(--card-link-color)'
const FG = 'var(--card-fg-color)'

/** Plain words either side of the treated one, so the picture reads as "a word in a heading". */
function Words({ treated }: { treated: (x: number, y: number, w: number) => React.ReactNode }) {
  return (
    <>
      <Heading x={26} y={40} w={44} h={11} />
      {treated(76, 40, 58)}
      <Heading x={26} y={58} w={72} h={11} />
      <Line x={26} y={84} w={108} />
      <Line x={26} y={90} w={78} />
    </>
  )
}

export const EmphasisBrandThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-brand">
    <Words treated={(x, y, w) => <rect x={x} y={y} width={w} height={11} rx={2} fill={ACCENT} />} />
  </Wireframe>
)

export const EmphasisColourThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-colour">
    <Words
      treated={(x, y, w) => (
        <rect x={x} y={y} width={w} height={11} rx={2} fill="var(--card-badge-caution-fg-color)" />
      )}
    />
  </Wireframe>
)

/** Bold or italic only: the word keeps its colour but is drawn heavier and slanted. */
export const EmphasisPlainThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-plain">
    <Words
      treated={(x, y, w) => (
        <>
          <rect x={x} y={y - 1} width={w} height={13} rx={2} fill={FG} opacity={0.95} />
          <path d={`M${x + w - 6} ${y - 1} l6 0 l-4 13 l-6 0 z`} fill="var(--card-bg-color)" />
        </>
      )}
    />
  </Wireframe>
)

export const EmphasisGradientThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-gradient">
    <defs>
      <linearGradient id="emphasis-thumb-gradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="var(--card-link-color)" />
        <stop offset="1" stopColor="var(--card-fg-color)" />
      </linearGradient>
    </defs>
    <Words
      treated={(x, y, w) => (
        <rect x={x} y={y} width={w} height={11} rx={2} fill="url(#emphasis-thumb-gradient)" />
      )}
    />
  </Wireframe>
)

export const EmphasisHighlightThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-highlight">
    <Words
      treated={(x, y, w) => (
        <>
          <rect x={x - 3} y={y - 3} width={w + 6} height={17} rx={3} fill={ACCENT} opacity={0.28} />
          <rect x={x} y={y} width={w} height={11} rx={2} fill={FG} opacity={0.85} />
        </>
      )}
    />
  </Wireframe>
)

export const EmphasisUnderlineThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="emphasis-underline">
    <Words
      treated={(x, y, w) => (
        <>
          <rect x={x} y={y} width={w} height={11} rx={2} fill={FG} opacity={0.85} />
          <rect x={x} y={y + 14} width={w} height={2.5} rx={1.25} fill={ACCENT} />
        </>
      )}
    />
  </Wireframe>
)

/** Custom: three colour swatches on a bar, in the Studio's own colours since the editor picks the real ones. */
export const EmphasisCustomGradientThumbnail = (_props: PresetThumbnailProps) => (
  <Wireframe label="gradient-custom">
    <defs>
      <linearGradient id="gradient-thumb-custom" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="var(--card-link-color)" />
        <stop offset="0.5" stopColor="var(--card-badge-caution-fg-color)" />
        <stop offset="1" stopColor="var(--card-badge-positive-fg-color)" />
      </linearGradient>
    </defs>
    <rect x={24} y={44} width={112} height={32} rx={6} fill="url(#gradient-thumb-custom)" />
    {[34, 80, 126].map((cx) => (
      <circle key={cx} cx={cx} cy={60} r={5} fill="var(--card-bg-color)" opacity={0.9} />
    ))}
  </Wireframe>
)

/**
 * A gradient preset as a bar from its first to last stop. These are the site's colours (the real
 * tokens), not the Studio theme's, like the tone swatches; the section's tone can shift them
 * slightly on the page.
 */
export function gradientThumbnail(gradient: HeadingGradient) {
  const stops = gradient.stops.map((stop) => colorHex[stop])
  const offsets = stops.map((colour, index) => ({
    colour,
    offset: index / Math.max(1, stops.length - 1),
  }))
  const Thumbnail = (_props: PresetThumbnailProps) => (
    <Wireframe label={`gradient-${gradient.value}`}>
      <defs>
        <linearGradient id={`gradient-thumb-${gradient.value}`} x1="0" x2="1" y1="0" y2="0">
          {offsets.map(({ offset, colour }) => (
            <stop key={offset} offset={offset} stopColor={colour} />
          ))}
        </linearGradient>
      </defs>
      <rect
        x={24}
        y={44}
        width={112}
        height={32}
        rx={6}
        fill={`url(#gradient-thumb-${gradient.value})`}
      />
    </Wireframe>
  )
  Thumbnail.displayName = `GradientThumbnail(${gradient.value})`
  return Thumbnail
}
