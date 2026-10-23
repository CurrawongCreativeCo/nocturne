import type { CSSProperties } from 'react'

import { SHAPE_CLASSES, SHAPE_FILL } from './shape-classes'

import type {
  InlineCase,
  InlineGap,
  InlinePhoneLayout,
  InlineSeparator,
  InlineSize,
  InlineWeight,
} from '@/lib/sanity/inline-list-options'
import { LETTER_SPACING_CLASSES, type LetterSpacing } from '@/lib/sanity/letter-spacing'
import { previewText } from '@/lib/sanity/preview-text'

// Full class names, so Tailwind's scanner sees them.
const SIZE: Record<InlineSize, string> = {
  small: 'text-small',
  medium: 'text-body',
  large: 'text-lead',
}
const WEIGHT: Record<InlineWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
}
const CASE: Record<InlineCase, string> = { normal: '', uppercase: 'uppercase tracking-wide' }
/** The space between two labels, in em so it follows the size; the separator sits in its middle. */
const GAP: Record<InlineGap, string> = { compact: '0.9em', comfortable: '1.4em', wide: '2em' }

/**
 * Each separator is a small drawn shape in `currentColor` (the separator colour), centred in the gap
 * before its label. Forced-colours mode drops backgrounds, so it falls back to the system text colour.
 */
const SHAPE: Record<Exclude<InlineSeparator, 'none'>, string> = {
  bullet: `size-[0.32em] ${SHAPE_CLASSES.dot}`,
  dot: `size-[0.18em] ${SHAPE_CLASSES.dot}`,
  line: `h-[0.9em] ${SHAPE_CLASSES.verticalLine}`,
  diamond: `size-[0.32em] ${SHAPE_CLASSES.diamond}`,
}
const SEPARATOR = `pointer-events-none absolute start-[calc(var(--inline-list-gap)/-2)] top-1/2 -translate-x-1/2 -translate-y-1/2 ${SHAPE_FILL}`

export interface InlineListProps {
  items: readonly string[]
  separator?: InlineSeparator
  size?: InlineSize
  weight?: InlineWeight
  letterSpacing?: LetterSpacing
  textCase?: InlineCase
  gap?: InlineGap
  phoneLayout?: InlinePhoneLayout
  /** Centre: lines are centred and share out their room. Start: lines start at the left. */
  align?: 'start' | 'center'
  /** CSS colours (lib/sanity/theme-colour.ts); undefined keeps the surrounding colour. */
  colour?: string
  separatorColour?: string
  /** Names the list for screen readers, e.g. "Services". */
  label?: string
  className?: string
}

/**
 * A short list of labels in one row, with a drawn separator between each two: "Bodywork • Breathwork
 * • Movement". It is a real list (`<ul>`, read as "list, 4 items"), and the separators are
 * `aria-hidden`, so a screen reader hears the labels only.
 *
 * Wrapping without a dangling separator, in CSS alone: each separator sits in the gap *before* its
 * label, and the list clips what falls outside it. A label that starts a line starts at the list's
 * edge, so its separator lands outside and is clipped; no separator is ever drawn after a label. For
 * that, every line must start at the edge: start-aligned lines do, and centred lines grow their
 * labels to fill the line (each label centred in its share), while a list that fits on one line is
 * only as wide as its labels (`w-max`, capped at the available width), so nothing spreads out.
 * Long labels wrap inside themselves.
 * "One per line" stacks the labels below 640 px and hides the separators there.
 */
export function InlineList({
  items,
  separator = 'bullet',
  size = 'small',
  weight = 'medium',
  textCase = 'normal',
  letterSpacing,
  gap = 'comfortable',
  phoneLayout = 'wrap',
  align = 'center',
  colour,
  separatorColour,
  label,
  className = '',
}: InlineListProps) {
  if (items.length === 0) return null
  const centred = align === 'center'
  const stack = phoneLayout === 'stack'
  const style = {
    '--inline-list-gap': GAP[gap],
    ...(colour && { color: colour }),
  } as CSSProperties
  return (
    <ul
      aria-label={label}
      data-inline-list={separator}
      data-phone-layout={phoneLayout}
      className={[
        'flex w-max max-w-full flex-wrap gap-x-(--inline-list-gap) gap-y-1 overflow-hidden',
        stack && (centred ? 'max-sm:flex-col max-sm:items-center' : 'max-sm:flex-col'),
        SIZE[size],
        WEIGHT[weight],
        textCase === 'uppercase' ? 'uppercase' : '',
        letterSpacing ? LETTER_SPACING_CLASSES[letterSpacing] : CASE[textCase],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {items.map((item, index) => {
        const { text, editInfo } = previewText(item)
        return (
          <li
            // Labels are plain strings with no key of their own; the same label twice keeps its place.
            key={`${String(index)}-${item}`}
            data-sanity={editInfo}
            className={`relative min-w-0 break-words ${centred ? 'grow text-center' : ''}`}
          >
            {index > 0 && separator !== 'none' && (
              <span
                aria-hidden="true"
                data-inline-separator=""
                className={`${SEPARATOR} ${SHAPE[separator]} ${stack ? 'max-sm:hidden' : ''}`}
                style={separatorColour ? { color: separatorColour } : undefined}
              />
            )}
            {text}
          </li>
        )
      })}
    </ul>
  )
}
