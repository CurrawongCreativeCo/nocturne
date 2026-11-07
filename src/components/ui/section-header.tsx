import type { CSSProperties } from 'react'

import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import type { HeadingBlocks } from '@/lib/sanity/heading-text'
import { textRoleProps } from '@/lib/sanity/text-role'
import type { OwnText, TextStyle } from '@/lib/sanity/text-style-options'

/** The usual eyebrow: small spaced capitals in the medium weight. */
const OWN_EYEBROW = {
  size: 'text-small',
  defaultSize: 'small',
  weight: 'medium',
  textCase: 'uppercase',
  colour: 'text-ink-muted',
} as const
const OWN_HEADING = { size: 'text-h2', weight: 'semibold' } as const
const OWN_INTRO = { size: 'text-lead', weight: 'regular', colour: 'text-ink-muted' } as const

const DEFAULT_EYEBROW_CLASS =
  'mb-3 text-small font-medium uppercase tracking-[0.08em] text-ink-muted'
const DEFAULT_HEADING_CLASS = 'text-h2 font-semibold text-balance'
const DEFAULT_INTRO_CLASS = 'mt-4 text-lead text-pretty text-ink-muted'

export type SectionHeaderRoles = Record<'eyebrow' | 'heading' | 'intro', TextStyle>

/** What each of the header's roles draws with nothing chosen, when a section's differ from the usual. */
export type SectionHeaderOwn = Partial<Record<'eyebrow' | 'heading' | 'intro', OwnText>>

/**
 * A section's header (task 156), a server component: an optional eyebrow, the heading with its
 * highlights, and an intro, each its own text role. Draws nothing without words. Sections differ in how
 * their header has always been drawn (its element, spacing and classes), so each of those is a prop and a
 * section keeps its output class for class: nothing is a default a section must accept. A section that
 * has only ever drawn a bare heading passes `bare`, and with no eyebrow or intro it still does.
 */
export function SectionHeader({
  eyebrow,
  title,
  heading,
  intro,
  design,
  spacing = 'mb-16 max-w-measure-narrow',
  block = '',
  text = '',
  bare = false,
  headingId,
  as: Wrapper = 'header',
  className,
  eyebrowClass = DEFAULT_EYEBROW_CLASS,
  headingClass = DEFAULT_HEADING_CLASS,
  introClass = DEFAULT_INTRO_CLASS,
  own,
  each = '',
}: {
  eyebrow?: string | null
  /** The plain title, drawn when `heading` has no words. */
  title?: string | null
  heading?: HeadingBlocks
  intro?: string | null
  design: SectionHeaderRoles
  /** The header's own space and measure. */
  spacing?: string
  /** The section's alignment classes (sectionTraits). */
  block?: string
  text?: string
  bare?: boolean
  /** The heading's id, for a section labelled by it (`aria-labelledby`). */
  headingId?: string
  /** The element around the header; null draws the parts alone, in the section's own container. */
  as?: 'header' | 'div' | null
  /** The wrapper's whole class, for a section whose header isn't `spacing`, block and text (FAQ's). */
  className?: string
  /** Each part's classes with nothing chosen. A text role steps from `own`, which says what they hold. */
  eyebrowClass?: string
  headingClass?: string
  introClass?: string
  own?: SectionHeaderOwn
  /** Classes added to every part, when there is no wrapper to hold them (a logo cloud's alignment). */
  each?: string
}) {
  if (!title && !eyebrow && !intro) return null
  const add = (base: string) => (each ? `${base} ${each}` : base)
  if (bare && !eyebrow && !intro) {
    return (
      <RichHeading
        as="h2"
        id={headingId}
        blocks={heading}
        fallback={title}
        {...headingProps(
          `${spacing} ${headingClass} ${block} ${text}`,
          design.heading,
          own?.heading,
        )}
      />
    )
  }
  const intros = textRoleProps('intro', add(introClass), own?.intro ?? OWN_INTRO, design.intro)
  const parts = (
    <>
      {eyebrow && (
        <p
          {...textRoleProps(
            'eyebrow',
            add(eyebrowClass),
            own?.eyebrow ?? OWN_EYEBROW,
            design.eyebrow,
          )}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <RichHeading
          as="h2"
          id={headingId}
          blocks={heading}
          fallback={title}
          {...headingProps(add(headingClass), design.heading, own?.heading)}
        />
      )}
      <PlainText text={intro} className={intros.className} style={intros.style} textRole="intro" />
    </>
  )
  if (Wrapper === null) return parts
  return <Wrapper className={className ?? `${spacing} ${block} ${text}`}>{parts}</Wrapper>
}

function headingProps(base: string, style: TextStyle, own: OwnText = OWN_HEADING) {
  const {
    'data-text-role': textRole,
    style: css,
    ...props
  } = textRoleProps('heading', base, own, style)
  return { ...props, ...(css ? { style: css satisfies CSSProperties } : {}), textRole }
}
