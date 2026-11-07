import type { CSSProperties } from 'react'

import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Lines, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'

const card = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.35, strokeWidth: 1 }

/** A framed quote: two lines of text and a name. */
function Quote({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} style={card} />
      <Lines x={x + 6} y={y + 8} w={w - 12} count={3} />
      <Line x={x + 6} y={y + h - 12} w={w * 0.4} />
    </g>
  )
}

/** Grid: a title over three quote cards side by side. */
export function TestimonialsGridThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="testimonials-grid">
      <Heading x={50} y={16} w={60} />
      {[10, 58, 106].map((x) => (
        <Quote key={x} x={x} y={38} w={44} h={64} />
      ))}
    </Wireframe>
  )
}

/** Slider: a title, quote cards running off the edge, then arrows and dots underneath. */
export function TestimonialsSliderThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="testimonials-slider">
      <Heading x={50} y={14} w={60} />
      <Quote x={10} y={34} w={64} h={52} />
      <Quote x={82} y={34} w={64} h={52} />
      <Quote x={154} y={34} w={64} h={52} />
      <circle cx={58} cy={100} r={3.5} style={{ ...card, fillOpacity: 0 }} />
      <circle cx={72} cy={100} r={2.5} style={{ fill: FG }} />
      <circle cx={80} cy={100} r={2.5} style={{ ...card, fillOpacity: 0 }} />
      <circle cx={88} cy={100} r={2.5} style={{ ...card, fillOpacity: 0 }} />
      <circle cx={102} cy={100} r={3.5} style={{ ...card, fillOpacity: 0 }} />
    </Wireframe>
  )
}

/** A quote and a name inside three small cards, each drawn in the preset's own look. */
function CardPreset({
  label,
  look,
  quoteLines = 3,
}: {
  label: string
  look: CSSProperties
  quoteLines?: number
}) {
  return (
    <Wireframe label={label}>
      {[10, 58, 106].map((x) => (
        <g key={x}>
          <rect x={x} y={26} width={44} height={68} rx={3} style={look} />
          <Lines x={x + 6} y={36} w={32} count={quoteLines} />
          <Line x={x + 6} y={82} w={16} />
        </g>
      ))}
    </Wireframe>
  )
}

const NO_FILL = { fill: 'none', stroke: 'none' }

export function CardPresetQuietThumbnail(_props: PresetThumbnailProps) {
  return <CardPreset label="card-preset-quiet" look={NO_FILL} />
}

export function CardPresetOutlinedThumbnail(_props: PresetThumbnailProps) {
  return (
    <CardPreset
      label="card-preset-outlined"
      look={{ fill: 'none', stroke: FG, strokeWidth: 1.5 }}
    />
  )
}

export function CardPresetTintedThumbnail(_props: PresetThumbnailProps) {
  return (
    <CardPreset label="card-preset-tinted" look={{ fill: FG, fillOpacity: 0.16, stroke: 'none' }} />
  )
}

export function CardPresetStatementThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="card-preset-statement">
      {[10, 58, 106].map((x) => (
        <g key={x} transform={`translate(${String(x + 2)} 30) skewX(-8)`}>
          <Line x={4} y={0} w={38} />
          <Line x={4} y={12} w={38} />
          <Line x={4} y={24} w={26} />
        </g>
      ))}
      {[10, 58, 106].map((x) => (
        <Line key={x} x={x + 6} y={82} w={16} />
      ))}
    </Wireframe>
  )
}
