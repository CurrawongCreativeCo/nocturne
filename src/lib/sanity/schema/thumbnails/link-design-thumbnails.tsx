import { Wireframe } from './wireframe'
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
