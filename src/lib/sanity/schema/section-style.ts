import { defineField, defineType, type FieldDefinition } from 'sanity'

import {
  ANCHOR_PATTERN,
  RESERVED_ANCHORS,
  SECTION_ALIGNS,
  SECTION_MOTIONS,
  SECTION_SPACINGS,
  SECTION_TONES,
  SECTION_WIDTHS,
} from '../section-style-options'

/**
 * Layout and style options every page-builder section shares, set by the agency in the section's
 * "Design" tab. SectionFrame (components/ui/section-frame.tsx) turns them into classes; the
 * value lists below are the contract with `resolveSectionStyle` (components/ui/section-style.ts).
 * An empty style renders each section as it always has, so existing content needs no migration.
 * The value lists live in ../section-style-options.ts, which the site can import without Studio.
 */

const radio = (values: readonly string[], titles: Record<string, string>) => ({
  list: values.map((value) => ({ title: titles[value] ?? value, value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

export const sectionStyle = defineType({
  name: 'sectionStyle',
  title: 'Section design',
  type: 'object',
  fields: [
    defineField({
      name: 'tone',
      type: 'string',
      description: 'The background and text colours. Everything inside the section follows.',
      initialValue: 'surface',
      options: radio(SECTION_TONES, {
        surface: 'Surface',
        alt: 'Soft',
        inverse: 'Dark',
        accent: 'Accent',
      }),
    }),
    defineField({
      name: 'spacing',
      title: 'Space above and below',
      type: 'string',
      initialValue: 'default',
      options: radio(SECTION_SPACINGS, {
        compact: 'Compact',
        default: 'Default',
        spacious: 'Spacious',
      }),
    }),
    defineField({
      name: 'width',
      title: 'Content width',
      type: 'string',
      initialValue: 'default',
      options: radio(SECTION_WIDTHS, {
        narrow: 'Narrow',
        default: 'Default',
        wide: 'Wide',
        full: 'Full width',
      }),
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      description: 'Headings and intro text.',
      type: 'string',
      options: radio(SECTION_ALIGNS, { start: 'Start', center: 'Centre' }),
    }),
    defineField({
      name: 'anchorId',
      title: 'Anchor',
      description:
        'Lets links jump to this section: "pricing" is reached with #pricing. Lowercase letters, numbers and hyphens; each one can be used once per page.',
      type: 'string',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          if (!ANCHOR_PATTERN.test(value)) {
            return 'Start with a letter, then lowercase letters, numbers and single hyphens'
          }
          return RESERVED_ANCHORS.includes(value) ? `"${value}" is used by the site itself` : true
        }),
    }),
    defineField({
      name: 'motion',
      title: 'Animation',
      description:
        "How the section appears as it scrolls into view. Fade up and staggered are not used on the first section of a page. Parallax moves a hero's background picture, or a picture beside text, slightly as the page scrolls. All are skipped for visitors who ask for less motion.",
      type: 'string',
      initialValue: 'reveal',
      options: radio(SECTION_MOTIONS, {
        none: 'None',
        reveal: 'Fade up',
        stagger: 'Staggered',
        parallax: 'Parallax',
      }),
    }),
  ],
})

/** Every section's field groups: its content first, then the agency's Design tab. */
export const sectionGroups = [
  { name: 'content', title: 'Content', default: true },
  { name: 'design', title: 'Design' },
]

/** What a section starts with when an editor adds it. Unset fields keep the section's own look. */
export type SectionStyleInitialValue = Partial<
  Record<'tone' | 'spacing' | 'width' | 'align' | 'motion', string>
>

/**
 * A section's `fields`: its own fields in the Content group, then the shared `style` in Design.
 * `initial` sets how this kind of section starts (a hero starts dark); pass the same values to
 * SectionFrame's `defaults` so a section without a style looks like a new one.
 */
export function sectionFields(
  content: FieldDefinition[],
  initial: SectionStyleInitialValue = {},
): FieldDefinition[] {
  return [
    // A field that names its own group (a section's `variant`, in Design) keeps it.
    ...content.map((field) => ({ ...field, group: field.group ?? 'content' })),
    defineField({
      name: 'style',
      title: 'Design',
      type: 'sectionStyle',
      group: 'design',
      initialValue: initial,
    }),
  ]
}
