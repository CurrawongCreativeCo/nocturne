import type { CSSProperties, ReactNode } from 'react'

import { frameMaskUrl } from '@/lib/sanity/frame-mask'
import type {
  ImageAppearance,
  ImageFrameColour,
  ImageFramePreset,
  ResolvedFrame,
} from '@/lib/sanity/image-design-options'
import { appearanceCorner, CORNER_PX, type FrameCorner } from '@/lib/sanity/image-frame-geometry'

/** Full class names, so Tailwind's scanner sees them. A frame takes the colour of a design token. */
const TEXT_COLOUR: Record<ImageFrameColour, string> = {
  accent: 'text-accent',
  'accent-2': 'text-accent-2',
  highlight: 'text-highlight',
  ink: 'text-ink',
}
const BACKGROUND_COLOUR: Record<ImageFrameColour, string> = {
  accent: 'bg-accent',
  'accent-2': 'bg-accent-2',
  highlight: 'bg-highlight',
  ink: 'bg-ink',
}

/**
 * Every built-in frame draws in a 0 to 100 box that stretches to the picture (`preserveAspectRatio="none"`),
 * with `vector-effect: non-scaling-stroke` so its lines keep their width however the box stretches.
 * `inset` is the gap to the picture's edge in those units. Colour is `currentColor`.
 */
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const

const rect = (inset: number) => ({
  x: inset,
  y: inset,
  width: 100 - 2 * inset,
  height: 100 - 2 * inset,
})

const FRAMES: Record<ImageFramePreset, (inset: number) => ReactNode> = {
  'thin-line': (inset) => <rect {...rect(inset)} {...STROKE} strokeWidth={2} />,
  'double-line': (inset) => (
    <>
      <rect {...rect(inset)} {...STROKE} strokeWidth={2} />
      <rect {...rect(inset + 2.5)} {...STROKE} strokeWidth={1} />
    </>
  ),
  // The outline of a second picture peeking out from behind this one, down and to the right.
  'offset-border': (inset) => (
    <path
      d={`M 100 ${inset} H ${100 + inset} V ${100 + inset} H ${inset} V 100`}
      {...STROKE}
      strokeWidth={2}
    />
  ),
  // A hand-drawn loop that overshoots where it closes, like a pen or a brush.
  'organic-brush': (inset) => (
    <g transform={`translate(${inset} ${inset}) scale(${(100 - 2 * inset) / 100})`}>
      <path
        d="M 4 5 C 22 1, 55 4, 96 2 C 99 30, 95 64, 97 96 C 68 99, 30 95, 3 98 C 5 68, 1 34, 4 5 C 6 3, 12 2, 18 2"
        {...STROKE}
        strokeWidth={3}
      />
      <path d="M 6 9 C 30 6, 60 8, 94 6" {...STROKE} strokeWidth={1} opacity={0.6} />
    </g>
  ),
  'corner-brackets': (inset) => {
    const near = inset
    const far = 100 - inset
    const arm = 14
    return (
      <path
        d={[
          `M ${near} ${near + arm} V ${near} H ${near + arm}`,
          `M ${far - arm} ${near} H ${far} V ${near + arm}`,
          `M ${far} ${far - arm} V ${far} H ${far - arm}`,
          `M ${near + arm} ${far} H ${near} V ${far - arm}`,
        ].join(' ')}
        {...STROKE}
        strokeWidth={3}
        strokeLinecap="square"
      />
    )
  },
}

/**
 * The outline of the shapes a line frame follows (task 177), from the same corner the picture's own
 * clip is cut with (`appearanceCorner`; components/ui/framed-image.tsx).
 */
const OUTLINE_RADIUS: Partial<Record<FrameCorner, string>> = {
  rounded: `${CORNER_PX.rounded}px`,
  circle: '50%',
  arch: 'calc(infinity * 1px) calc(infinity * 1px) 0 0',
}

/** A line along the shape, centred on the line the artwork would draw: `inset` percent in, `width` px wide. */
function outlineStyle(radius: string, inset: number, width: number, shift = false): CSSProperties {
  const half = `${width / 2}px`
  const near = `calc(${inset}% - ${half})`
  // The offset border is the same outline moved down and to the right by its inset.
  const far = shift ? `calc(${-inset}% - ${half})` : near
  return {
    top: near,
    left: near,
    right: far,
    bottom: far,
    borderWidth: width,
    borderRadius: radius,
  }
}

/**
 * A Simple, Double or Offset frame on Rounded, Circle or Arch: the shape's own outline instead of the
 * built-in rectangle. Same inset, stroke widths and colour as the artwork, so only the corners differ.
 * The offset outline sits under the picture (its box paints over it), so only the part outside shows.
 */
export function ShapeOutline({
  frame,
  shape,
  colour: override,
}: {
  frame: Extract<ResolvedFrame, { kind: 'preset' }>
  shape: ImageAppearance
  colour?: string
}) {
  const radius = OUTLINE_RADIUS[appearanceCorner(shape)] ?? '0'
  const colour = override ? '' : TEXT_COLOUR[frame.colour]
  const line = 'pointer-events-none absolute border-solid border-current'
  const layers =
    frame.preset === 'double-line'
      ? [
          { key: 'outer', style: outlineStyle(radius, frame.inset, 2) },
          { key: 'inner', style: outlineStyle(radius, frame.inset + 2.5, 1) },
        ]
      : [
          {
            key: 'line',
            style: outlineStyle(radius, frame.inset, 2, frame.preset === 'offset-border'),
          },
        ]
  return (
    <div
      aria-hidden="true"
      data-image-frame={frame.preset}
      data-frame-outline={shape}
      className={`pointer-events-none absolute inset-0 ${colour}`.trim()}
      style={override ? { color: override } : undefined}
    >
      {layers.map(({ key, style }) => (
        <div key={key} className={line} style={style} />
      ))}
    </div>
  )
}

/**
 * The decorative layer over a framed picture: it fills the picture's box, ignores the pointer and is
 * hidden from assistive technology. It never moves; only the picture behind it does.
 *
 * A built-in preset is an inline SVG. An approved custom frame is never inlined: the uploaded artwork is
 * used as a CSS mask on a div filled with the chosen token colour, so it recolours with the theme,
 * scales with the picture and, loaded as an image, cannot run a script.
 */
export function ImageFrame({
  frame,
  colour: override,
  width,
}: {
  frame: ResolvedFrame
  /** A CSS colour (a theme-colour field) instead of the frame's token. */
  colour?: string
  /** Twice the largest rendered width; defaults to the site's content width at 2×. */
  width?: number
}) {
  const colour = override ? '' : TEXT_COLOUR[frame.colour]

  if (frame.kind === 'custom') {
    const url = frameMaskUrl(frame.url, width)
    if (!url) return null
    const responsive = width === undefined && frame.url.includes('/images/')
    const mask = responsive ? 'var(--frame-mask)' : `url("${url}")`
    const style: CSSProperties = {
      inset: `${frame.inset}%`,
      maskImage: mask,
      WebkitMaskImage: mask,
      maskSize: '100% 100%',
      WebkitMaskSize: '100% 100%',
      maskRepeat: 'no-repeat',
      maskMode: 'alpha',
      WebkitMaskRepeat: 'no-repeat',
      backgroundColor: override,
    }
    const masks = responsive
      ? {
          '--frame-mask-small': `url("${frameMaskUrl(frame.url, 1280)}")`,
          '--frame-mask-medium': `url("${frameMaskUrl(frame.url, 2048)}")`,
          '--frame-mask-large': `url("${url}")`,
        }
      : {}
    return (
      <div
        aria-hidden="true"
        data-image-frame="custom"
        className={`pointer-events-none absolute ${override ? '' : BACKGROUND_COLOUR[frame.colour]} ${responsive ? '[--frame-mask:var(--frame-mask-small)] sm:[--frame-mask:var(--frame-mask-medium)] lg:[--frame-mask:var(--frame-mask-large)]' : ''}`.trim()}
        style={{ ...style, ...masks }}
      />
    )
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-image-frame={frame.preset}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full overflow-visible ${colour}`.trim()}
      style={override ? { color: override } : undefined}
    >
      {FRAMES[frame.preset](frame.inset)}
    </svg>
  )
}
