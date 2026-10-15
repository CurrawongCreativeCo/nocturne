import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Lines, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'

const frame = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.35, strokeWidth: 1 }
const dot = { fill: FG, fillOpacity: 0.28 }

/** A portrait square over a name and a line of text. */
function Person({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} style={frame} />
      <circle cx={x + size / 2} cy={y + size * 0.4} r={size * 0.17} style={dot} />
      <rect
        x={x + size * 0.2}
        y={y + size * 0.62}
        width={size * 0.6}
        height={size * 0.3}
        rx={size * 0.15}
        style={dot}
      />
      <rect
        x={x}
        y={y + size + 5}
        width={size * 0.8}
        height={4}
        rx={2}
        style={{ fill: FG, opacity: 0.85 }}
      />
      <Line x={x} y={y + size + 12} w={size * 0.55} />
    </g>
  )
}

/** Grid: a title over a row of portraits with names. */
export function TeamGridThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="team-grid">
      <Heading x={10} y={12} w={56} />
      {[10, 58, 106].map((x) => (
        <Person key={x} x={x} y={34} size={44} />
      ))}
    </Wireframe>
  )
}

/** Slider: portraits running off the edge, then arrows and dots underneath. */
export function TeamSliderThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="team-slider">
      <Heading x={10} y={10} w={56} />
      {[10, 62, 114].map((x) => (
        <Person key={x} x={x} y={28} size={46} />
      ))}
      <rect x={150} y={28} width={20} height={46} rx={3} style={frame} />
      <circle cx={58} cy={106} r={3.5} style={{ ...frame, fillOpacity: 0 }} />
      <circle cx={72} cy={106} r={2.5} style={{ fill: FG }} />
      <circle cx={80} cy={106} r={2.5} style={{ ...frame, fillOpacity: 0 }} />
      <circle cx={88} cy={106} r={2.5} style={{ ...frame, fillOpacity: 0 }} />
      <circle cx={102} cy={106} r={3.5} style={{ ...frame, fillOpacity: 0 }} />
    </Wireframe>
  )
}

/** List: a title over rows, each a small portrait beside a name and two lines. */
export function TeamListThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="team-list">
      <Heading x={10} y={10} w={56} />
      {[30, 61, 92].map((y) => (
        <g key={y}>
          <rect x={10} y={y} width={22} height={22} rx={3} style={frame} />
          <circle cx={21} cy={y + 9} r={4} style={dot} />
          <rect x={40} y={y + 2} width={44} height={4} rx={2} style={{ fill: FG, opacity: 0.85 }} />
          <Lines x={40} y={y + 10} w={100} count={2} />
        </g>
      ))}
    </Wireframe>
  )
}
