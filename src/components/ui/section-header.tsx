import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import type { HeadingBlocks } from '@/lib/sanity/heading-text'
import { textRoleProps } from '@/lib/sanity/text-role'
import type { TextStyle } from '@/lib/sanity/text-style-options'

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

export type SectionHeaderRoles = Record<'eyebrow' | 'heading' | 'intro', TextStyle>

/**
 * A section's header (task 156), a server component: an optional eyebrow, the heading with its
 * highlights, and an intro, each its own text role. Draws nothing without words. A section that has only
 * ever drawn a bare heading passes `bare`, and with no eyebrow or intro it still does, class for class.
 */
export function SectionHeader({
  eyebrow,
  title,
  heading,
  intro,
  design,
  spacing = 'mb-16 max-w-measure-narrow',
  block,
  text,
  bare = false,
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
  block: string
  text: string
  bare?: boolean
}) {
  if (!title && !eyebrow && !intro) return null
  const headingBase = 'text-h2 font-semibold text-balance'
  if (bare && !eyebrow && !intro) {
    return (
      <RichHeading
        as="h2"
        blocks={heading}
        fallback={title}
        {...headingProps(`${spacing} ${headingBase} ${block} ${text}`, design.heading)}
      />
    )
  }
  const intros = textRoleProps(
    'intro',
    'mt-4 text-lead text-pretty text-ink-muted',
    OWN_INTRO,
    design.intro,
  )
  return (
    <header className={`${spacing} ${block} ${text}`}>
      {eyebrow && (
        <p
          {...textRoleProps(
            'eyebrow',
            'mb-3 text-small font-medium uppercase tracking-[0.08em] text-ink-muted',
            OWN_EYEBROW,
            design.eyebrow,
          )}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <RichHeading
          as="h2"
          blocks={heading}
          fallback={title}
          {...headingProps(headingBase, design.heading)}
        />
      )}
      <PlainText text={intro} className={intros.className} style={intros.style} textRole="intro" />
    </header>
  )
}

function headingProps(base: string, style: TextStyle) {
  const { 'data-text-role': textRole, ...props } = textRoleProps(
    'heading',
    base,
    OWN_HEADING,
    style,
  )
  return { ...props, textRole }
}
