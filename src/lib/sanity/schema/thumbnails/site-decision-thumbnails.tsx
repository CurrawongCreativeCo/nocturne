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

/**
 * A main and a secondary button on the page, each choice drawn as the site draws it: a gradient or
 * solid fill, a shadow beneath, a halo around, a tint or an outline on the second button. The
 * wireframe palette stays the site's own, so the picture is generic rather than the editor's colours.
 */
type ButtonThumbnailChoice =
  | { fill: 'solid' | 'gradient' }
  | { depth: 'flat' | 'soft' | 'raised' }
  | { glow: 'off' | 'soft' | 'strong' }
  | { secondary: 'outline' | 'soft' }

function ButtonThumbnail({ choice }: { choice: ButtonThumbnailChoice }) {
  const key = Object.entries(choice)[0]?.join('-') ?? ''
  const id = `button-${key}`
  const gradient = 'fill' in choice && choice.fill === 'gradient'
  const depth = 'depth' in choice ? choice.depth : 'flat'
  const glow = 'glow' in choice ? choice.glow : 'off'
  const secondary = 'secondary' in choice ? choice.secondary : 'outline'
  const showSecondary = 'secondary' in choice
  const main = { x: showSecondary ? 20 : 40, y: 46, width: showSecondary ? 56 : 80, height: 22 }
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`button-${key}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={colorHex.accent} />
          <stop offset="1" stopColor={colorHex.accent2} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="200%">
          <feDropShadow
            dx="0"
            dy={depth === 'raised' ? 5 : 2}
            stdDeviation={depth === 'raised' ? 3.5 : 1.5}
            floodColor="#000000"
            floodOpacity={depth === 'raised' ? 0.3 : 0.25}
          />
        </filter>
        <filter id={`${id}-glow`} x="-50%" y="-80%" width="200%" height="260%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={glow === 'strong' ? 7 : 4}
            floodColor={colorHex.accent}
            floodOpacity={glow === 'strong' ? 0.8 : 0.5}
          />
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surface} />
      <rect x={20} y={22} width={72} height={5} rx={2} fill={colorHex.ink} />
      <rect x={20} y={31} width={104} height={3} rx={1.5} fill={colorHex.inkMuted} />
      <rect
        {...main}
        rx={11}
        fill={gradient ? `url(#${id})` : colorHex.cta}
        filter={
          glow !== 'off' ? `url(#${id}-glow)` : depth !== 'flat' ? `url(#${id}-shadow)` : undefined
        }
      />
      {showSecondary && (
        <rect
          x={88}
          y={46}
          width={52}
          height={22}
          rx={11}
          fill={secondary === 'soft' ? colorHex.line : 'none'}
          stroke={secondary === 'outline' ? colorHex.lineStrong : 'none'}
          strokeWidth={1.5}
        />
      )}
    </svg>
  )
}

export const ButtonFillSolidThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ fill: 'solid' }} />
)
export const ButtonFillGradientThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ fill: 'gradient' }} />
)
export const ButtonDepthFlatThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ depth: 'flat' }} />
)
export const ButtonDepthSoftThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ depth: 'soft' }} />
)
export const ButtonDepthRaisedThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ depth: 'raised' }} />
)
export const ButtonGlowOffThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ glow: 'off' }} />
)
export const ButtonGlowSoftThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ glow: 'soft' }} />
)
export const ButtonGlowStrongThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ glow: 'strong' }} />
)
export const SecondaryOutlineThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ secondary: 'outline' }} />
)
export const SecondarySoftThumbnail = (_props: PresetThumbnailProps) => (
  <ButtonThumbnail choice={{ secondary: 'soft' }} />
)
