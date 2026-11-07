import { PlainText } from '@/components/ui/plain-text'
import { RichHeading } from '@/components/ui/rich-heading'
import type { HeadingBlocks } from '@/lib/sanity/heading-text'
import { resolveTextRoles, textRoleProps, type TextRolesInput } from '@/lib/sanity/text-role'

import { WordmarkHeading, type WordmarkImage } from './wordmark-heading'

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** The eyebrow, heading and intro with nothing chosen. The heading is a step down beside a profile's name. */
const OWN_EYEBROW = {
  size: 'text-small',
  defaultSize: 'small',
  weight: 'medium',
  textCase: 'uppercase',
  colour: 'text-ink-muted',
} as const
const OWN_H2 = { size: 'text-h2', weight: 'semibold' } as const
const OWN_H4 = { size: 'text-h4', weight: 'semibold' } as const
const OWN_INTRO = { size: 'text-lead', weight: 'regular', colour: 'text-ink-muted' } as const

/**
 * The Link list's heading part (task 156): the heading alone as it has always been drawn, or, once the
 * list has an eyebrow or an intro, the three together with the part's space on the wrapper. A heading
 * shown as a wordmark picture has no text to style, so its role is neither offered nor applied, while an
 * eyebrow and an intro still frame it.
 */
export function LinkListHeading({
  eyebrow,
  intro,
  title,
  heading,
  wordmark,
  level,
  beside,
  hasName,
  preload,
  design,
}: {
  eyebrow?: string | null
  intro?: string | null
  /** The plain title, also the wordmark's alt text. */
  title?: string
  heading?: HeadingBlocks
  wordmark?: WordmarkImage | null
  /** The heading's level, from the list's heading levels. */
  level: 'h1' | 'h2' | 'h3'
  /** A divider sits right below this part, and brings its own space. */
  beside: boolean
  hasName: boolean
  preload: boolean
  /** The stored header design, as the query returns it. */
  design: TextRolesInput<(typeof HEADER_ROLES)[number]> | null | undefined
}) {
  const roles = resolveTextRoles(design, HEADER_ROLES)
  const framed = Boolean(eyebrow ?? intro)
  const space = beside ? '' : 'mb-8'
  const own = hasName ? OWN_H4 : OWN_H2
  const base = `text-balance ${hasName ? 'text-h4 font-semibold' : 'text-h2 font-semibold'}`

  const headingNode = wordmark ? (
    <WordmarkHeading
      as={title ? level : 'div'}
      alt={title ?? ''}
      image={wordmark}
      preload={preload}
      className={framed ? undefined : space}
    />
  ) : title ? (
    (() => {
      const { 'data-text-role': textRole, ...look } = textRoleProps(
        'heading',
        framed ? base : `${space} ${base}`,
        own,
        roles.heading,
      )
      return (
        <RichHeading as={level} blocks={heading} fallback={title} {...look} textRole={textRole} />
      )
    })()
  ) : null
  if (!framed) return headingNode

  const intros = textRoleProps(
    'intro',
    'mt-4 text-lead text-pretty text-ink-muted',
    OWN_INTRO,
    roles.intro,
  )
  return (
    <div className={space}>
      {eyebrow && (
        <p
          {...textRoleProps(
            'eyebrow',
            'mb-3 text-small font-medium uppercase tracking-[0.08em] text-ink-muted',
            OWN_EYEBROW,
            roles.eyebrow,
          )}
        >
          {eyebrow}
        </p>
      )}
      {headingNode}
      <PlainText text={intro} className={intros.className} style={intros.style} textRole="intro" />
    </div>
  )
}
