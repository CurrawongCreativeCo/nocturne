import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Lines, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

const frame = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.35, strokeWidth: 1 }
const strong = { fill: FG, opacity: 0.85 }

/** A date badge: a small square with a day number block under a month line. */
function DateBadge({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} style={frame} />
      <rect
        x={x + size * 0.25}
        y={y + size * 0.2}
        width={size * 0.5}
        height={2.5}
        rx={1.25}
        style={{ fill: ACCENT }}
      />
      <rect
        x={x + size * 0.28}
        y={y + size * 0.45}
        width={size * 0.44}
        height={size * 0.3}
        rx={2}
        style={strong}
      />
    </g>
  )
}

/** List: a title over rows, each a date badge beside a title, a line of detail and an arrow. */
export function EventsListThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="events-list">
      <Heading x={10} y={10} w={56} />
      {[30, 61, 92].map((y) => (
        <g key={y}>
          <DateBadge x={10} y={y} size={22} />
          <rect x={40} y={y + 2} width={60} height={4} rx={2} style={strong} />
          <Lines x={40} y={y + 11} w={80} count={1} />
          <path
            d="M144 0l4 4-4 4"
            transform={`translate(0 ${y + 7})`}
            fill="none"
            style={{ stroke: FG, strokeOpacity: 0.5, strokeWidth: 1.5 }}
          />
        </g>
      ))}
    </Wireframe>
  )
}

/** Agenda: events grouped under a date heading, each with its time in a column on the left. */
export function EventsAgendaThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="events-agenda">
      <Heading x={10} y={10} w={56} />
      {[
        { y: 30, rows: 2 },
        { y: 72, rows: 2 },
      ].map(({ y, rows }) => (
        <g key={y}>
          <rect x={10} y={y} width={44} height={4} rx={2} style={{ fill: ACCENT }} />
          <line
            x1={10}
            x2={150}
            y1={y + 8}
            y2={y + 8}
            style={{ stroke: FG, strokeOpacity: 0.25 }}
          />
          {Array.from({ length: rows }, (_, row) => (
            <g key={row}>
              <Line x={10} y={y + 14 + row * 14} w={22} />
              <rect x={42} y={y + 12 + row * 14} width={64} height={4} rx={2} style={strong} />
              <Line x={42} y={y + 19 + row * 14} w={40} />
            </g>
          ))}
        </g>
      ))}
    </Wireframe>
  )
}

/** Featured: the next event large, with a picture, and the ones after it smaller beside it. */
export function EventsFeaturedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="events-featured">
      <Heading x={10} y={10} w={56} />
      <rect x={10} y={28} width={84} height={80} rx={3} style={frame} />
      <rect x={10} y={28} width={84} height={44} rx={3} style={{ ...frame, fillOpacity: 0.1 }} />
      <path d="M10 66l22-16 18 12 14-8 30 18v0H10z" style={{ fill: FG, opacity: 0.18 }} />
      <circle cx={30} cy={42} r={5} style={{ fill: FG, opacity: 0.25 }} />
      <DateBadge x={16} y={78} size={16} />
      <rect x={38} y={80} width={48} height={4} rx={2} style={strong} />
      <Lines x={38} y={89} w={46} count={2} />
      {[28, 70].map((y) => (
        <g key={y}>
          <DateBadge x={102} y={y} size={18} />
          <rect x={126} y={y + 2} width={26} height={4} rx={2} style={strong} />
          <Line x={126} y={y + 11} w={20} />
          <Line x={102} y={y + 26} w={48} />
        </g>
      ))}
    </Wireframe>
  )
}
