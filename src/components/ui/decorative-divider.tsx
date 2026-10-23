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
      className={`block min-w-4 shrink-[4] ${THICKNESS[divider.thickness]} ${fade} ${className}`}
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
 * A decorative divider inside a section (lib/sanity/divider-options.ts): a line, a fading line or
 * three dots, with an optional diamond, icon, few words or small picture between two lines, in
 * `currentColor` (the line colour unless one is chosen; the middle follows the lines unless it has
 * its own). Decoration is hidden from assistive technology; words in the middle are read like any
 * text. `block` centres it in a centred section. It brings its own space above and below
 * (`my-6`), so the parts beside it drop theirs on that side (LinkListView does).
 */
export function DecorativeDivider({
  divider,
  block = '',
  className = '',
}: {
  divider: ResolvedDivider
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
