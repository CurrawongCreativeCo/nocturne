import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Lines, Picture, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

const outline = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.4, strokeWidth: 1 }
const dot = { fill: FG, fillOpacity: 0.28 }

/** The profile block at the top of every layout: a round picture over a name and a line of bio. */
function Profile({ y = 7, size = 14 }: { y?: number; size?: number }) {
  return (
    <g>
      <circle cx={80} cy={y + size / 2} r={size / 2} style={{ ...outline, fillOpacity: 0.12 }} />
      <Heading x={62} y={y + size + 3} w={36} h={4} />
      <Line x={56} y={y + size + 11} w={48} />
    </g>
  )
}

/** A row of three round social icons under the profile. */
function Socials({ y }: { y: number }) {
  return (
    <>
      {[72, 80, 88].map((cx) => (
        <circle key={cx} cx={cx} cy={y} r={2.6} style={dot} />
      ))}
    </>
  )
}

/** Minimal: full-width pill buttons, one under the other. */
export function LinkListMinimalThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="link-list-minimal">
      <Profile y={6} size={12} />
      <Socials y={38} />
      {[46, 66, 86].map((y, index) => (
        <g key={y}>
          <rect x={30} y={y} width={100} height={14} rx={7} style={outline} />
          {index === 0 ? (
            <rect x={30} y={y} width={100} height={14} rx={7} style={{ fill: ACCENT }} />
          ) : null}
          <rect
            x={72}
            y={y + 5.5}
            width={16}
            height={3}
            rx={1.5}
            style={{ fill: FG, opacity: 0.7 }}
          />
        </g>
      ))}
    </Wireframe>
  )
}

/** Cards: small thumbnails in a two-column grid. */
export function LinkListCardsThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="link-list-cards">
      <Profile y={5} size={12} />
      {[0, 1].flatMap((row) =>
        [0, 1].map((col) => {
          const x = 22 + col * 60
          const y = 44 + row * 36
          return (
            <g key={`${row}-${col}`}>
              <rect x={x} y={y} width={56} height={32} rx={4} style={outline} />
              <Picture x={x + 3} y={y + 3} w={14} h={14} />
              <Heading x={x + 21} y={y + 5} w={26} h={4} />
              <Line x={x + 21} y={y + 12} w={20} />
              <Lines x={x + 4} y={y + 21} w={44} count={2} />
            </g>
          )
        }),
      )}
    </Wireframe>
  )
}

/** Editorial: big type, links as a list with an arrow at the end of each row. */
export function LinkListEditorialThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="link-list-editorial">
      <Heading x={14} y={10} w={70} h={9} />
      <Lines x={14} y={25} w={96} count={2} />
      {[44, 66, 88].map((y) => (
        <g key={y}>
          <rect x={14} y={y - 4} width={132} height={0.8} style={{ fill: FG, opacity: 0.3 }} />
          <Heading x={14} y={y + 3} w={52} h={6} />
          <Line x={14} y={y + 13} w={34} />
          <path
            d={`M134 ${y + 8} h10 m-4 -4 l4 4 l-4 4`}
            style={{
              fill: 'none',
              stroke: FG,
              strokeWidth: 1.4,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          />
        </g>
      ))}
    </Wireframe>
  )
}

/** Compact: small pills, wrapping, under a short heading. */
export function LinkListCompactThumbnail(_props: PresetThumbnailProps) {
  const pills = [
    { x: 14, y: 40, w: 38 },
    { x: 56, y: 40, w: 30 },
    { x: 90, y: 40, w: 44 },
    { x: 14, y: 58, w: 28 },
    { x: 46, y: 58, w: 42 },
    { x: 92, y: 58, w: 32 },
    { x: 14, y: 76, w: 36 },
    { x: 54, y: 76, w: 26 },
  ]
  return (
    <Wireframe label="link-list-compact">
      <Heading x={14} y={14} w={56} />
      <Line x={14} y={26} w={90} />
      {pills.map(({ x, y, w }, index) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x}
            y={y}
            width={w}
            height={11}
            rx={5.5}
            style={index === 0 ? { fill: ACCENT } : outline}
          />
          <circle cx={x + 6} cy={y + 5.5} r={2} style={dot} />
          <rect
            x={x + 11}
            y={y + 4}
            width={w - 17}
            height={3}
            rx={1.5}
            style={{ fill: FG, opacity: 0.6 }}
          />
        </g>
      ))}
    </Wireframe>
  )
}

/** Image-focused: a big picture leads each card; the title sits underneath. */
export function LinkListImageThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="link-list-image">
      <Profile y={4} size={11} />
      {[0, 1].map((col) => {
        const x = 20 + col * 62
        return (
          <g key={col}>
            <rect x={x} y={38} width={58} height={74} rx={4} style={outline} />
            <Picture x={x + 3} y={41} w={52} h={46} />
            <Heading x={x + 5} y={94} w={34} h={4} />
            <Line x={x + 5} y={102} w={24} />
          </g>
        )
      })}
    </Wireframe>
  )
}
