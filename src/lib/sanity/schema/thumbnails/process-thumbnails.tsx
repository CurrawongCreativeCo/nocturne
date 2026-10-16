import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

/** A numbered marker on the timeline's line. */
function Marker({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={4}
      style={{ fill: ACCENT, stroke: 'var(--card-bg-color)', strokeWidth: 1.5 }}
    />
  )
}

/** The line: filled in the accent down to `filled`, the rest faint. */
function TimelineLine({
  x,
  y1,
  y2,
  filled,
}: {
  x: number
  y1: number
  y2: number
  filled: number
}) {
  return (
    <>
      <rect
        x={x - 0.75}
        y={y1}
        width={1.5}
        height={y2 - y1}
        style={{ fill: FG, fillOpacity: 0.2 }}
      />
      <rect x={x - 0.75} y={y1} width={1.5} height={filled - y1} style={{ fill: ACCENT }} />
    </>
  )
}

/** Vertical: a title, then one line down the left with each step's text beside its marker. */
export function ProcessVerticalThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="process-vertical">
      <Heading x={16} y={12} w={56} />
      <TimelineLine x={20} y1={34} y2={104} filled={80} />
      {[34, 60, 86].map((y) => (
        <g key={y}>
          <Marker x={20} y={y} />
          <Heading x={32} y={y - 4} w={40} h={5} />
          <Line x={32} y={y + 4} w={84} />
        </g>
      ))}
    </Wireframe>
  )
}

/** Alternating: the line down the middle, steps falling to the left and right in turn. */
export function ProcessAlternatingThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="process-alternating">
      <Heading x={52} y={10} w={56} />
      <TimelineLine x={80} y1={30} y2={108} filled={82} />
      {[36, 62, 88].map((y, index) => (
        <g key={y}>
          <Marker x={80} y={y} />
          <Heading x={index % 2 === 0 ? 30 : 92} y={y - 4} w={40} h={5} />
          <Line x={index % 2 === 0 ? 18 : 92} y={y + 4} w={52} />
        </g>
      ))}
    </Wireframe>
  )
}
