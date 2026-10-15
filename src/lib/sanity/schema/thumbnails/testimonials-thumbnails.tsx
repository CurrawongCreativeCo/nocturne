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
