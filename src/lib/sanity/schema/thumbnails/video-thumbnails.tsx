import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Lines, Picture, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

/** A round Play button with its triangle. */
function Play({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} style={{ fill: ACCENT }} />
      <path
        d={`M${cx - r * 0.3} ${cy - r * 0.45} L${cx + r * 0.5} ${cy} L${cx - r * 0.3} ${cy + r * 0.45} Z`}
        style={{ fill: 'var(--card-bg-color)' }}
      />
    </g>
  )
}

/** Embed: a heading over a poster with a Play button, and the small "Plays from" note. */
export function VideoEmbedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="video-embed">
      <Heading x={14} y={12} w={60} />
      <Picture x={14} y={28} w={132} h={70} />
      <Play cx={80} cy={63} r={11} />
      <rect x={62} y={104} width={36} height={3} rx={1.5} style={{ fill: FG, opacity: 0.35 }} />
    </Wireframe>
  )
}

/** Ambient: a full-width picture with the words on it and a small Pause button in the corner. */
export function VideoAmbientThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="video-ambient">
      <Picture x={0} y={14} w={160} h={92} frame={false} glyph={false} />
      <Heading x={14} y={40} w={62} />
      <Lines x={14} y={54} w={70} count={2} />
      <rect x={134} y={90} width={14} height={10} rx={5} style={{ fill: FG, opacity: 0.7 }} />
      <rect
        x={138}
        y={92.5}
        width={2.4}
        height={5}
        rx={0.6}
        style={{ fill: 'var(--card-bg-color)' }}
      />
      <rect
        x={142.2}
        y={92.5}
        width={2.4}
        height={5}
        rx={0.6}
        style={{ fill: 'var(--card-bg-color)' }}
      />
    </Wireframe>
  )
}
