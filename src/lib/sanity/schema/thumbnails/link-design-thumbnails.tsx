import { Wireframe } from './wireframe'
import type { ShadowLevel } from '../../depth-options'
import type { DividerStyle } from '../../divider-options'
import type { LinkArrowStyle } from '../../link-arrow-options'
import type { SocialStyle } from '../../social-style-options'
import type { PresetThumbnailProps } from '../preset-field'

const FG = 'var(--card-fg-color)'
const outline = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.4, strokeWidth: 1 }
const stroke = {
  fill: 'none',
  stroke: FG,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const ARROW_PATHS: Record<Exclude<LinkArrowStyle, 'none'>, (x: number, y: number) => string> = {
  chevron: (x, y) => `M${x - 3} ${y - 6} l6 6 -6 6`,
  arrow: (x, y) => `M${x - 8} ${y} h14 m-5 -5 5 5 -5 5`,
  external: (x, y) => `M${x - 6} ${y + 6} l11 -11 m-7 0 h7 v7`,
}

/** Three link rows, each ending in the style's indicator. */
function ArrowThumbnail({ arrow }: { arrow: LinkArrowStyle }) {
  return (
    <Wireframe label={`link-arrow-${arrow}`}>
      {[18, 50, 82].map((y) => (
        <g key={y}>
          <rect x={20} y={y} width={120} height={22} rx={8} style={outline} />
          <rect x={30} y={y + 9} width={48} height={4} rx={2} style={{ fill: FG, opacity: 0.6 }} />
          {arrow === 'none' ? null : <path d={ARROW_PATHS[arrow](126, y + 11)} {...stroke} />}
        </g>
      ))}
    </Wireframe>
  )
}

export const linkArrowThumbnails: Record<
  LinkArrowStyle,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  chevron: () => <ArrowThumbnail arrow="chevron" />,
  arrow: () => <ArrowThumbnail arrow="arrow" />,
  external: () => <ArrowThumbnail arrow="external" />,
  none: () => <ArrowThumbnail arrow="none" />,
}

/** A row of four social icons in the style's container. */
function SocialThumbnail({ shape }: { shape: SocialStyle }) {
  const radius = { plain: 0, circle: 14, rounded: 7, square: 3 }[shape]
  return (
    <Wireframe label={`social-style-${shape}`}>
      {[34, 66, 98, 130].map((cx) => (
        <g key={cx}>
          {shape === 'plain' ? null : (
            <rect x={cx - 14} y={46} width={28} height={28} rx={radius} style={outline} />
          )}
          <circle cx={cx} cy={60} r={6} {...stroke} strokeWidth={2.5} />
        </g>
      ))}
    </Wireframe>
  )
}

export const socialStyleThumbnails: Record<
  SocialStyle,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  plain: () => <SocialThumbnail shape="plain" />,
  circle: () => <SocialThumbnail shape="circle" />,
  rounded: () => <SocialThumbnail shape="rounded" />,
  square: () => <SocialThumbnail shape="square" />,
}

/** Three link rows lifted by the level's shadow, drawn as a soft offset shape under each row. */
function ShadowThumbnail({ level }: { level: ShadowLevel }) {
  const lift = { flat: 0, soft: 2, raised: 4, floating: 7 }[level]
  return (
    <Wireframe label={`link-shadow-${level}`}>
      {[18, 50, 82].map((y) => (
        <g key={y}>
          {lift > 0 && (
            <rect
              x={20 + lift / 2}
              y={y + lift}
              width={120}
              height={22}
              rx={8}
              style={{ fill: FG, opacity: 0.06 + lift * 0.025 }}
            />
          )}
          <rect
            x={20}
            y={y - lift / 2}
            width={120}
            height={22}
            rx={8}
            style={{ ...outline, fill: 'var(--card-bg-color)', fillOpacity: 1 }}
          />
          <rect
            x={30}
            y={y + 9 - lift / 2}
            width={48}
            height={4}
            rx={2}
            style={{ fill: FG, opacity: 0.6 }}
          />
        </g>
      ))}
    </Wireframe>
  )
}

export const shadowThumbnails: Record<
  ShadowLevel,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  flat: () => <ShadowThumbnail level="flat" />,
  soft: () => <ShadowThumbnail level="soft" />,
  raised: () => <ShadowThumbnail level="raised" />,
  floating: () => <ShadowThumbnail level="floating" />,
}

/** A profile block above a link row, with the divider style between them. */
function DividerThumbnail({ style }: { style: DividerStyle }) {
  const y = 62
  const rule = { fill: FG, opacity: 0.55 }
  return (
    <Wireframe label={`divider-${style}`}>
      <circle cx={80} cy={22} r={10} style={outline} />
      <rect x={55} y={38} width={50} height={5} rx={2.5} style={{ fill: FG, opacity: 0.6 }} />
      {style === 'line' && <rect x={50} y={y} width={60} height={1.5} style={rule} />}
      {style === 'fade' && (
        <>
          <defs>
            <linearGradient id="divider-fade">
              <stop offset="0" stopColor={FG} stopOpacity={0} />
              <stop offset="0.5" stopColor={FG} stopOpacity={0.7} />
              <stop offset="1" stopColor={FG} stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={40} y={y} width={80} height={1.5} fill="url(#divider-fade)" />
        </>
      )}
      {style === 'dots' &&
        [72, 80, 88].map((cx) => <circle key={cx} cx={cx} cy={y + 0.75} r={1.8} style={rule} />)}
      {style === 'diamond' && (
        <>
          <rect x={50} y={y} width={25} height={1.5} style={rule} />
          <rect
            x={77.5}
            y={y - 1.75}
            width={5}
            height={5}
            transform={`rotate(45 80 ${y + 0.75})`}
            style={rule}
          />
          <rect x={85} y={y} width={25} height={1.5} style={rule} />
        </>
      )}
      <rect x={20} y={82} width={120} height={22} rx={8} style={outline} />
    </Wireframe>
  )
}

export const dividerThumbnails: Record<
  DividerStyle,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  none: () => <DividerThumbnail style="none" />,
  line: () => <DividerThumbnail style="line" />,
  fade: () => <DividerThumbnail style="fade" />,
  dots: () => <DividerThumbnail style="dots" />,
  diamond: () => <DividerThumbnail style="diamond" />,
}
