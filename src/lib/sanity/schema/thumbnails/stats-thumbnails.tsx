import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

/** A big figure over its label: the heading block is the number, the thin line the label. */
function Figure({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <>
      <Heading x={x} y={y} w={w} h={11} />
      <Line x={x + w * 0.1} y={y + 17} w={w * 0.8} />
    </>
  )
}

/** Inline: a title, then three figures side by side on the page, no frames. */
export function StatsInlineThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="stats-inline">
      <Heading x={50} y={22} w={60} />
      <Line x={56} y={36} w={48} />
      <Figure x={16} y={58} w={32} />
      <Figure x={64} y={58} w={32} />
      <Figure x={112} y={58} w={32} />
    </Wireframe>
  )
}

/** Cards: the same three figures, each in its own framed card with an accent rule. */
export function StatsCardsThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="stats-cards">
      <Heading x={50} y={16} w={60} />
      <Line x={56} y={30} w={48} />
      {[12, 58, 104].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={46}
            width={44}
            height={58}
            rx={3}
            style={{ fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.35, strokeWidth: 1 }}
          />
          <rect x={x + 8} y={54} width={12} height={2.5} rx={1.25} style={{ fill: ACCENT }} />
          <Heading x={x + 8} y={66} w={28} h={11} />
          <Line x={x + 8} y={86} w={26} />
        </g>
      ))}
    </Wireframe>
  )
}
