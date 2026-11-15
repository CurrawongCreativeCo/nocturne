import type { CSSProperties } from 'react'

import type {
  DividerCentreSize,
  DividerThickness,
  DividerWidth,
  ResolvedCentre,
  ResolvedDivider,
} from '@/lib/sanity/divider-options'
import { LETTER_SPACING_CLASSES } from '@/lib/sanity/letter-spacing'
import { previewText } from '@/lib/sanity/preview-text'

import { BadgeIcon } from './badge-icon'
import { FLOURISH_DIAMOND, FLOURISH_PATHS } from './divider-flourish'
import { SanityImage } from './sanity-image'
import { SHAPE_CLASSES, SHAPE_FILL } from './shape-classes'

// Full class names, so Tailwind's scanner sees them.
/** Length of the whole divider when it is a plain rule. */
const RULE_WIDTH: Record<DividerWidth, string> = {
  short: 'w-24',
  medium: 'w-48',
  long: 'w-80',
  full: 'w-full',
}
/** Length of each line beside a centre; Full width lets them share the row. They shrink on a phone. */
const SIDE_WIDTH: Record<DividerWidth, string> = {
  short: 'w-8',
  medium: 'w-16',
  long: 'w-28',
  full: 'flex-1',
}
const THICKNESS: Record<DividerThickness, string> = {
  thin: SHAPE_CLASSES.horizontalLine,
  bold: 'h-0.5',
}
const ICON: Record<DividerCentreSize, string> = {
  small: 'size-4',
  medium: 'size-6',
  large: 'size-8',
}
const PICTURE: Record<DividerCentreSize, string> = { small: 'h-5', medium: 'h-8', large: 'h-12' }
const TEXT: Record<DividerCentreSize, string> = {
  small: 'text-small',
  medium: 'text-body',
  large: 'text-lead',
}
// Forced-colours mode drops backgrounds, so the shapes fall back to the system text colour.
const FILL = SHAPE_FILL

/**
 * Double, Dotted line and Gradient (task 151, Slice 7), from the Divider Design Lab's measurements, where `t` is
 * the line's thickness in px (thin 1, bold 2): Double is two lines of `t` with a 3px gap, so `2t + 3` tall;
 * Dotted line is dots of radius `1.1t` every `5t + 3` px, `3t + 2` tall; Gradient is `t + 1` tall, Primary to
 * Secondary, faded to nothing over the last 40% of each outer end (15% at both ends of a line with no centre).
 * Heights are full class names, so Tailwind's scanner sees them.
 *
 * FORCED COLOURS remove background images, gradients included, and keep borders, painted in the user's system
 * colours. So Double is drawn from borders (two lines of `t` with the gap between them, the same picture as two
 * background bars), and Dotted line, whose dots are a background, falls back to a dotted top border of the dots'
 * size in forced colours. Gradient falls back to a plain system-text line.
 */
const LINE_PX: Record<DividerThickness, number> = { thin: 1, bold: 2 }
/** Two borders with the 3px gap between them (the box is border-box): `2t + 3` tall. */
const DOUBLE: Record<DividerThickness, string> = {
  thin: 'h-[5px] border-y border-current',
  bold: 'h-[7px] border-y-2 border-current',
}
/** Dots of a background, and in forced colours a dotted top border as thick as a dot is wide (2px, 4px). */
const DOTTED: Record<DividerThickness, string> = {
  thin: 'h-[5px] forced-colors:border-t-2 forced-colors:border-dotted forced-colors:border-[CanvasText]',
  bold: 'h-2 forced-colors:border-t-4 forced-colors:border-dotted forced-colors:border-[CanvasText]',
}
const GRADIENT_HEIGHT: Record<DividerThickness, string> = { thin: 'h-0.5', bold: 'h-[3px]' }
/** Primary to Secondary: tone-aware roles, and in forced colours a plain system-text line. */
const GRADIENT_PAINT =
  'bg-linear-to-r from-accent to-accent-2 forced-colors:bg-none forced-colors:bg-[CanvasText]'
const GRADIENT_FADE = {
  start: '[mask-image:linear-gradient(to_right,transparent,#000_40%)]',
  end: '[mask-image:linear-gradient(to_left,transparent,#000_40%)]',
  alone: '[mask-image:linear-gradient(to_right,transparent,#000_15%,#000_85%,transparent)]',
}

/**
 * Glow (task 151, Slice 7), from the Lab: a soft halo of the line's own colour, `0 0 (6 + 2t)px t px` at 55%
 * (`t` the line's thickness). Line and Double take it as a box-shadow on the line, which paints outside the line's
 * box and adds nothing to the layout. Gradient is masked at its ends, and a mask would clip a shadow to the line's
 * own box, so its glow is a blurred copy of the gradient on a layer of its own, larger than the line (room for the
 * halo past its ends and above and below) and masked from the line's own ends. In forced colours the glow is
 * dropped, and the line (and the middle) stay.
 */
const GLOW: Record<DividerThickness, string> = {
  thin: '[box-shadow:0_0_8px_1px_color-mix(in_oklab,currentColor_55%,transparent)] forced-colors:[box-shadow:none]',
  bold: '[box-shadow:0_0_10px_2px_color-mix(in_oklab,currentColor_55%,transparent)] forced-colors:[box-shadow:none]',
}
/**
 * The glow layer is the line's own box, plus `R` (three sigmas of the blur: 12px thin, 15px bold) above and below,
 * and plus `R` past the INNER end of a line beside a centre, where the halo runs on into the gap before the
 * middle. It is never wider than that: an outer end is faded to nothing, so there is no halo past it to draw, and a
 * layer reaching past it would only push the page sideways where a full-width section has no gutter. A mask clips
 * to the box it is on, so the layer's fade is written from the line's own ends: the line's 40% ramp at the outer
 * end (15% at each end of a line with no centre), opaque from there on. The blurred copy of the line sits in the
 * layer, `R` in from the inner side and from top and bottom.
 */
interface GlowLayer {
  room: string
  copy: string
  mask: string
}
const GRADIENT_GLOW: Record<DividerThickness, Record<'start' | 'end' | 'alone', GlowLayer>> = {
  thin: {
    start: {
      room: '-inset-y-3 left-0 -right-3',
      copy: 'inset-y-[11px] left-0 right-3 blur-[4px]',
      mask: '[mask-image:linear-gradient(to_right,transparent,#000_calc((100%_-_12px)_*_0.4))]',
    },
    end: {
      room: '-inset-y-3 -left-3 right-0',
      copy: 'inset-y-[11px] left-3 right-0 blur-[4px]',
      mask: '[mask-image:linear-gradient(to_left,transparent,#000_calc((100%_-_12px)_*_0.4))]',
    },
    alone: {
      room: '-inset-y-3 inset-x-0',
      copy: 'inset-y-[11px] inset-x-0 blur-[4px]',
      mask: GRADIENT_FADE.alone,
    },
  },
  bold: {
    start: {
      room: '-inset-y-4 left-0 -right-[15px]',
      copy: 'inset-y-[14px] left-0 right-[15px] blur-[5px]',
      mask: '[mask-image:linear-gradient(to_right,transparent,#000_calc((100%_-_15px)_*_0.4))]',
    },
    end: {
      room: '-inset-y-4 -left-[15px] right-0',
      copy: 'inset-y-[14px] left-[15px] right-0 blur-[5px]',
      mask: '[mask-image:linear-gradient(to_left,transparent,#000_calc((100%_-_15px)_*_0.4))]',
    },
    alone: {
      room: '-inset-y-4 inset-x-0',
      copy: 'inset-y-[14px] inset-x-0 blur-[5px]',
      mask: GRADIENT_FADE.alone,
    },
  },
}

/** The size of the Ornament's flourish, the Lab's 90 by 18 at medium; small (70 by 14) and large (110 by 22) keep its 5 to 1 proportions, the flourish's own 120 by 24. */
const ORNAMENT: Record<DividerCentreSize, string> = {
  small: 'h-3.5 w-[70px]',
  medium: 'h-[18px] w-[90px]',
  large: 'h-[22px] w-[110px]',
}

/** The dots of a Dotted line: a background made from `currentColor`, which is the line colour. */
function dottedPicture(thickness: DividerThickness): CSSProperties {
  const t = LINE_PX[thickness]
  // Rounded, so 1.1 + 0.6 is 1.7px and not 1.7000000000000002px.
  const px = (value: number) => String(Math.round(value * 100) / 100)
  const radius = t * 1.1
  return {
    background: `radial-gradient(circle, currentColor ${px(radius)}px, transparent ${px(radius + 0.6)}px) 0 50% / ${px(t * 5 + 3)}px 100% repeat-x`,
  }
}

/** One line: even, or fading towards its outer end (`side`), or towards both ends when it stands alone. */
function Line({
  divider,
  side,
  className,
}: {
  divider: ResolvedDivider
  side?: 'start' | 'end'
  className: string
}) {
  const { style, thickness } = divider
  const glow = divider.finish === 'glow' ? ` ${GLOW[thickness]}` : ''
  if (style === 'double')
    return (
      <span
        aria-hidden="true"
        className={`block min-w-4 shrink-[4] ${DOUBLE[thickness]}${glow} ${className}`}
      />
    )
  if (style === 'dotted')
    return (
      <span
        aria-hidden="true"
        className={`block min-w-4 shrink-[4] ${DOTTED[thickness]} ${className}`}
        style={dottedPicture(thickness)}
      />
    )
  if (style === 'gradient' && divider.finish === 'glow') {
    const layer = GRADIENT_GLOW[thickness][side ?? 'alone']
    return (
      <span
        aria-hidden="true"
        className={`relative block min-w-4 shrink-[4] ${GRADIENT_HEIGHT[thickness]} ${className}`}
      >
        <span
          className={`pointer-events-none absolute forced-colors:hidden ${layer.room} ${layer.mask}`}
        >
          <span className={`absolute opacity-55 ${layer.copy} ${GRADIENT_PAINT}`} />
        </span>
        <span className={`absolute inset-0 ${GRADIENT_PAINT} ${GRADIENT_FADE[side ?? 'alone']}`} />
      </span>
    )
  }
  if (style === 'gradient')
    return (
      <span
        aria-hidden="true"
        className={`block min-w-4 shrink-[4] ${GRADIENT_HEIGHT[thickness]} ${GRADIENT_PAINT} ${GRADIENT_FADE[side ?? 'alone']} ${className}`}
      />
    )
  const fade =
    divider.style !== 'fade'
      ? FILL
      : side === 'start'
        ? 'bg-linear-to-r from-transparent to-current forced-colors:bg-[CanvasText]'
        : side === 'end'
          ? 'bg-linear-to-l from-transparent to-current forced-colors:bg-[CanvasText]'
          : 'bg-linear-to-r from-transparent via-current to-transparent forced-colors:bg-[CanvasText]'
  return (
    <span
      aria-hidden="true"
      className={`block min-w-4 shrink-[4] ${THICKNESS[divider.thickness]} ${fade}${divider.style === 'line' ? glow : ''} ${className}`}
    />
  )
}

function Centre({
  centre,
  size,
  thickness,
}: {
  centre: ResolvedCentre
  size: DividerCentreSize
  thickness: DividerThickness
}) {
  switch (centre.kind) {
    case 'diamond':
      return (
        <span
          aria-hidden="true"
          className={`block shrink-0 ${SHAPE_CLASSES.diamond} ${thickness === 'bold' ? 'size-2' : 'size-1.5'} ${FILL}`}
        />
      )
    case 'ornament':
      return (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 120 24"
          className={`shrink-0 overflow-visible ${ORNAMENT[size]}`}
        >
          {FLOURISH_PATHS.map((path) => (
            <path
              key={path}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
          ))}
          <rect
            x={FLOURISH_DIAMOND.x}
            y={FLOURISH_DIAMOND.y}
            width={FLOURISH_DIAMOND.size}
            height={FLOURISH_DIAMOND.size}
            transform={FLOURISH_DIAMOND.transform}
            fill="currentColor"
          />
        </svg>
      )
    case 'icon':
      return (
        <span aria-hidden="true" className="shrink-0">
          <BadgeIcon name={centre.icon} className={ICON[size]} />
        </span>
      )
    case 'image':
      return (
        <SanityImage
          image={centre.image}
          alt=""
          height={96}
          sizes="96px"
          className={`w-auto shrink-0 object-contain ${PICTURE[size]}`}
        />
      )
    case 'text': {
      // Real words, so they are read out (a label such as "Stay connected"); only the lines are hidden.
      const { text, editInfo } = previewText(centre.text)
      return (
        <span
          data-sanity={editInfo}
          className={`text-center text-balance ${TEXT[size]} ${centre.textCase === 'uppercase' ? 'uppercase' : ''} ${centre.letterSpacing ? LETTER_SPACING_CLASSES[centre.letterSpacing] : centre.textCase === 'uppercase' ? 'tracking-[0.2em]' : 'tracking-[0.08em]'}`}
        >
          {text}
        </span>
      )
    }
  }
}

/**
 * A decorative divider inside a section (lib/sanity/divider-options.ts): a line, a fading line, a double line,
 * a dotted line, a Primary to Secondary gradient or three dots, with an optional diamond, icon, few words or small picture between two lines, in
 * `currentColor` (the line colour unless one is chosen; the middle follows the lines unless it has
 * its own). Decoration is hidden from assistive technology; words in the middle are read like any
 * text. `block` centres it in a centred section. It brings its own space above and below
 * (`my-6`), so the parts beside it drop theirs on that side (LinkListView does).
 */
export function DecorativeDivider({
  divider,
  block = '',
  className = '',
  id,
}: {
  divider: ResolvedDivider
  id?: string
  /** From `sectionTraits`: `mx-auto` in a centred section. */
  block?: string
  className?: string
}) {
  const { style, width, centre } = divider
  const words = centre?.kind === 'text'
  const classes = [
    'my-6 flex max-w-full items-center',
    divider.lineColour ? '' : 'text-line-strong',
    // With a centre, the row is as wide as its lines and middle; at Full width the lines share it.
    style === 'dots'
      ? 'w-fit gap-2'
      : centre
        ? `gap-3 ${width === 'full' ? 'w-full' : 'w-max'}`
        : RULE_WIDTH[width],
    block,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      id={id}
      aria-hidden={words ? undefined : true}
      data-decorative-divider={style}
      data-divider-centre={centre?.kind}
      className={classes}
      style={divider.lineColour ? { color: divider.lineColour } : undefined}
    >
      {style === 'dots' ? (
        [0, 1, 2].map((dot) => (
          <span key={dot} className={`block size-1 ${SHAPE_CLASSES.dot} ${FILL}`} />
        ))
      ) : centre ? (
        <>
          <Line divider={divider} side="start" className={SIDE_WIDTH[width]} />
          {/* Reserve the two minimum 1rem lines and two 0.75rem gaps; shrink lines before words. */}
          <span
            className="flex max-w-[calc(100%-3.5rem)] min-w-0 shrink-0 items-center justify-center"
            style={divider.centreColour ? { color: divider.centreColour } : undefined}
          >
            <Centre centre={centre} size={divider.centreSize} thickness={divider.thickness} />
          </span>
          <Line divider={divider} side="end" className={SIDE_WIDTH[width]} />
        </>
      ) : (
        <Line divider={divider} className="w-full" />
      )}
    </div>
  )
}
