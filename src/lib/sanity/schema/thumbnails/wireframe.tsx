import type { CSSProperties, ReactNode } from 'react'

/**
 * The thumbnails' shared visual language: a 4:3 page of wireframe parts. Blocks are headings, thin
 * lines are text, a framed area with a hill and a sun is a picture, a pill is a button. Parts draw
 * with the Card variables Sanity UI sets from the Studio theme (`--card-fg-color` and friends), so
 * every thumbnail follows the CMS brand in light and dark, and in a chosen (primary tone) card,
 * without being told the scheme.
 */

export const WIDTH = 160
export const HEIGHT = 120

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

const fill = (colour: string, opacity: number): CSSProperties => ({ fill: colour, opacity })

interface BoxProps {
  x: number
  y: number
  w: number
}

/** Fixed 4:3 canvas. Decorative: the card's title names the option. */
export function Wireframe({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={label}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} style={{ fill: 'var(--card-bg-color)' }} />
      {children}
    </svg>
  )
}

export function Heading({ x, y, w, h = 7 }: BoxProps & { h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={2} style={fill(FG, 0.85)} />
}

export function Line({ x, y, w }: BoxProps) {
  return <rect x={x} y={y} width={w} height={3} rx={1.5} style={fill(FG, 0.35)} />
}

/** A few lines of text, each a little shorter than the last, as a paragraph looks. */
export function Lines({ x, y, w, count = 2 }: BoxProps & { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, row) => (
        <Line key={row} x={x} y={y + row * 6} w={row === count - 1 ? w * 0.7 : w} />
      ))}
    </>
  )
}

export function Eyebrow({ x, y, w = 16 }: Omit<BoxProps, 'w'> & { w?: number }) {
  return <rect x={x} y={y} width={w} height={2.5} rx={1.25} style={fill(ACCENT, 0.9)} />
}

export function Button({ x, y, w = 22 }: Omit<BoxProps, 'w'> & { w?: number }) {
  return <rect x={x} y={y} width={w} height={8} rx={4} style={fill(ACCENT, 1)} />
}

/** The picture placeholder: a soft panel with a hill and a sun (drawn when it is big enough, and by default only when framed:
 * a picture that fills a section sits behind text, which the hill would cross). */
export function Picture({
  x,
  y,
  w,
  h,
  frame = true,
  glyph = frame,
}: BoxProps & { h: number; frame?: boolean; glyph?: boolean }) {
  const drawGlyph = glyph && Math.min(w, h) >= 24
  const sun = Math.min(w, h) * 0.09
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={frame ? 3 : 0}
        style={{
          ...fill(FG, 0.1),
          stroke: FG,
          strokeOpacity: frame ? 0.4 : 0,
          strokeWidth: 1,
        }}
      />
      {drawGlyph ? (
        <>
          <circle cx={x + w * 0.7} cy={y + h * 0.3} r={sun} style={fill(FG, 0.3)} />
          <path
            d={`M${x + w * 0.1} ${y + h * 0.85} L${x + w * 0.4} ${y + h * 0.5} L${x + w * 0.58} ${y + h * 0.7} L${x + w * 0.74} ${y + h * 0.56} L${x + w * 0.92} ${y + h * 0.85} Z`}
            style={fill(FG, 0.22)}
          />
        </>
      ) : null}
    </g>
  )
}
