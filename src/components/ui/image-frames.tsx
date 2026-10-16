import type { CSSProperties, ReactNode } from 'react'

import type {
  ImageFrameColour,
  ImageFramePreset,
  ResolvedFrame,
} from '@/lib/sanity/image-design-options'

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
 * The decorative layer over a framed picture: it fills the picture's box, ignores the pointer and is
 * hidden from assistive technology. It never moves; only the picture behind it does.
 *
 * A built-in preset is an inline SVG. An approved custom frame is never inlined: the uploaded SVG is
 * used as a CSS mask on a div filled with the chosen token colour, so it recolours with the theme,
 * scales with the picture and, loaded as an image, cannot run a script.
 */
export function ImageFrame({ frame }: { frame: ResolvedFrame }) {
  const colour = TEXT_COLOUR[frame.colour]

  if (frame.kind === 'custom') {
    const mask = `url("${frame.url}")`
    const style: CSSProperties = {
      inset: `${frame.inset}%`,
      maskImage: mask,
      WebkitMaskImage: mask,
      maskSize: '100% 100%',
      WebkitMaskSize: '100% 100%',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
    }
    return (
      <div
        aria-hidden="true"
        data-image-frame="custom"
        className={`pointer-events-none absolute ${BACKGROUND_COLOUR[frame.colour]}`}
        style={style}
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
      className={`pointer-events-none absolute inset-0 size-full overflow-visible ${colour}`}
    >
      {FRAMES[frame.preset](frame.inset)}
    </svg>
  )
}
