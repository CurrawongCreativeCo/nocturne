import { colorHex } from '@/config/tokens.generated'

import { HEIGHT, WIDTH } from './wireframe'
import { TODAY, headingStyleOf, type HeadingStyleName } from '../../../design/heading-styles'
import type { Density, Shape } from '../../../design/site-decision-options'
import type { PresetThumbnailProps } from '../preset-field'

/**
 * Three bands of content stacked on a page: the gap between them is the option. Drawn in the site's
 * colours, as the tone and edge thumbnails are, with the gaps in the 75%, 100% and 125% the choices
 * really apply.
 */
const GAP: Record<Density, number> = { compact: 5, standard: 8, airy: 12 }

function DensityThumbnail({ density }: { density: Density }) {
  const gap = GAP[density]
  const band = 22
  const top = (HEIGHT - (band * 3 + gap * 2)) / 2
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`density-${density}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceAlt} />
      {[0, 1, 2].map((row) => {
        const y = top + row * (band + gap)
        return (
          <g key={row}>
            <rect x={20} y={y} width={WIDTH - 40} height={band} rx={2} fill={colorHex.surface} />
            <rect x={30} y={y + 6} width={64} height={5} rx={2} fill={colorHex.ink} />
            <rect x={30} y={y + 15} width={92} height={3} rx={1.5} fill={colorHex.inkMuted} />
          </g>
        )
      })}
    </svg>
  )
}

/** Two cards and a button, with the corner radius the choice sets (scaled to the picture). */
const RADIUS: Record<Shape, number> = { sharp: 1, soft: 5, round: 11 }

function ShapeThumbnail({ shape }: { shape: Shape }) {
  const radius = RADIUS[shape]
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`shape-${shape}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceAlt} />
      {[24, 86].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={22}
            width={50}
            height={52}
            rx={radius}
            fill={colorHex.surface}
            stroke={colorHex.line}
          />
          <rect x={x + 8} y={32} width={34} height={5} rx={2} fill={colorHex.ink} />
          <rect x={x + 8} y={42} width={26} height={3} rx={1.5} fill={colorHex.inkMuted} />
        </g>
      ))}
      <rect x={56} y={88} width={48} height={14} rx={7} fill={colorHex.accent} />
    </svg>
  )
}

export const DensityCompactThumbnail = (_props: PresetThumbnailProps) => (
  <DensityThumbnail density="compact" />
)
export const DensityStandardThumbnail = (_props: PresetThumbnailProps) => (
  <DensityThumbnail density="standard" />
)
export const DensityAiryThumbnail = (_props: PresetThumbnailProps) => (
  <DensityThumbnail density="airy" />
)
export const ShapeSharpThumbnail = (_props: PresetThumbnailProps) => (
  <ShapeThumbnail shape="sharp" />
)
export const ShapeSoftThumbnail = (_props: PresetThumbnailProps) => <ShapeThumbnail shape="soft" />
export const ShapeRoundThumbnail = (_props: PresetThumbnailProps) => (
  <ShapeThumbnail shape="round" />
)

/**
 * A heading and two lines of text set at the style's weight, tracking and size (the table the site
 * reads, heading-styles.ts). Drawn as text in the system font, because that is the point: the style
 * changes the heading's character, not its font.
 */
function HeadingStyleThumbnail({ name }: { name: HeadingStyleName }) {
  const style = name === 'standard' ? TODAY : headingStyleOf(name)
  const size = 30 * style.scale.h2
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`heading-style-${name}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surface} />
      <text
        x={20}
        y={58}
        fontSize={size}
        fontWeight={style.weight}
        letterSpacing={style.tracking}
        fontFamily="system-ui, sans-serif"
        fill={colorHex.ink}
      >
        Aa Title
      </text>
      <rect x={20} y={74} width={112} height={3} rx={1.5} fill={colorHex.inkMuted} />
      <rect x={20} y={83} width={86} height={3} rx={1.5} fill={colorHex.inkMuted} />
    </svg>
  )
}

export const HeadingStandardThumbnail = (_props: PresetThumbnailProps) => (
  <HeadingStyleThumbnail name="standard" />
)
export const HeadingEditorialThumbnail = (_props: PresetThumbnailProps) => (
  <HeadingStyleThumbnail name="editorial" />
)
export const HeadingModernThumbnail = (_props: PresetThumbnailProps) => (
  <HeadingStyleThumbnail name="modern" />
)
export const HeadingClassicThumbnail = (_props: PresetThumbnailProps) => (
  <HeadingStyleThumbnail name="classic" />
)
