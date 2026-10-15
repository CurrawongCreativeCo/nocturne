import {
  defineField,
  defineType,
  type ConditionalProperty,
  type ConditionalPropertyCallback,
  type FieldDefinition,
} from 'sanity'

import { hiddenFromClients } from '../roles'
import {
  ANCHOR_PATTERN,
  RESERVED_ANCHORS,
  SECTION_ALIGNS,
  SECTION_SPACINGS,
  SECTION_TONE_TITLES,
  SECTION_WIDTHS,
} from '../section-style-options'
import { presetField } from './preset-field'
import {
  alignmentHidden,
  registerSectionRules,
  sectionAtStylePath,
  staleAlignmentMessage,
  staleMotionMessage,
  visibleMotions,
  type SectionFormRules,
} from './section-form'
import {
  MotionNoneThumbnail,
  MotionParallaxThumbnail,
  MotionRevealThumbnail,
  MotionStaggerThumbnail,
} from './thumbnails/animation-thumbnails'
import {
  ToneAccentThumbnail,
  ToneAltThumbnail,
  ToneInverseThumbnail,
  ToneSurfaceThumbnail,
} from './thumbnails/tone-thumbnails'

/**
 * Layout and style options every page-builder section shares, set by the agency in the section's
 * "Design" tab: Background and Animation as pictures, then a collapsed "More layout options" (space,
 * width, alignment, anchor). The tab and its fields are hidden from clients. SectionFrame (components/ui/section-frame.tsx) turns them into classes; the
 * value lists below are the contract with `resolveSectionStyle` (components/ui/section-style.ts).
 * An empty style renders each section as it always has, so existing content needs no migration.
 * The value lists live in ../section-style-options.ts, which the site can import without Studio.
 */

const radio = (values: readonly string[], titles: Record<string, string>) => ({
  list: values.map((value) => ({ title: titles[value] ?? value, value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

declare module 'sanity' {
  interface ObjectOptions {
    /** Show the object's fields without its own title and frame (the Studio field is in features/studio/components/frameless-field). */
    frameless?: boolean
  }
}

export const sectionStyle = defineType({
  name: 'sectionStyle',
  title: 'Section design',
  type: 'object',
  // The fields are rendered straight into the Design tab, not in a box of their own.
  options: { frameless: true },
  fieldsets: [
    {
      name: 'layoutOptions',
      title: 'More layout options',
      description: 'Space, width, alignment and anchor. The defaults suit most sections.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    presetField({
      name: 'tone',
      title: 'Background',
      description: 'The background and text colours. Everything inside the section follows.',
      required: false,
      options: [
        {
          value: 'surface',
          title: SECTION_TONE_TITLES.surface,
          description: 'The page colour.',
          thumbnail: ToneSurfaceThumbnail,
        },
        {
          value: 'alt',
          title: SECTION_TONE_TITLES.alt,
          description: 'A light grey band.',
          thumbnail: ToneAltThumbnail,
        },
        {
          value: 'inverse',
          title: SECTION_TONE_TITLES.inverse,
          description: 'Light text on dark.',
          thumbnail: ToneInverseThumbnail,
        },
        {
          value: 'accent',
          title: SECTION_TONE_TITLES.accent,
          description: 'The brand colour.',
          thumbnail: ToneAccentThumbnail,
        },
      ],
      initialValue: 'surface',
    }),
    presetField({
      name: 'motion',
      title: 'Animation',
      description:
        'How the section appears as it scrolls into view. Skipped for visitors who ask for less motion. Fade up and staggered are not used on the first section of a page.',
      required: false,
      options: [
        {
          value: 'none',
          title: 'None',
          description: 'Appears with the page.',
          thumbnail: MotionNoneThumbnail,
        },
        {
          value: 'reveal',
          title: 'Fade up',
          description: 'Fades in once as it scrolls into view.',
          thumbnail: MotionRevealThumbnail,
        },
        {
          value: 'stagger',
          title: 'Staggered',
          description: 'Its parts appear one after another.',
          thumbnail: MotionStaggerThumbnail,
        },
        {
          value: 'parallax',
          title: 'Parallax',
          description: 'The picture drifts a little as the page scrolls.',
          thumbnail: MotionParallaxThumbnail,
        },
      ],
      initialValue: 'reveal',
      // Parallax moves a picture, so it is only offered on layouts that have one.
      visibleOptions: ({ document, path }) =>
        visibleMotions(sectionAtStylePath(document, path as never)),
      validation: (rule) =>
        rule.custom((value, context) => staleMotionMessage(value, context)).warning(),
    }),
    defineField({
      name: 'spacing',
      title: 'Space above and below',
      type: 'string',
      fieldset: 'layoutOptions',
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
      fieldset: 'layoutOptions',
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
      fieldset: 'layoutOptions',
      options: radio(SECTION_ALIGNS, { start: 'Start', center: 'Centre' }),
      // Layouts that set their own alignment don't offer it.
      hidden: alignmentHidden,
      validation: (rule) =>
        rule.custom((value, context) => staleAlignmentMessage(value, context)).warning(),
    }),
    defineField({
      name: 'anchorId',
      title: 'Anchor',
      description:
        'Lets links jump to this section: "pricing" is reached with #pricing. Lowercase letters, numbers and hyphens; each one can be used once per page.',
      type: 'string',
      fieldset: 'layoutOptions',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          if (!ANCHOR_PATTERN.test(value)) {
            return 'Start with a letter, then lowercase letters, numbers and single hyphens'
          }
          return RESERVED_ANCHORS.includes(value) ? `"${value}" is used by the site itself` : true
        }),
    }),
  ],
})

/**
 * Every section's field groups: its content first, then the agency's Design tab. The Design tab is
 * hidden from clients (UI only: see README, "Studio roles and permissions").
 */
export const sectionGroups = [
  { name: 'content', title: 'Content', default: true },
  { name: 'design', title: 'Design', hidden: hiddenFromClients },
]

/**
 * Add as a section type's `fieldsets`. "Advanced" holds the section's `advanced` fields (see
 * sectionFields); Studio leaves it out of the form when none of them apply to the chosen layout.
 */
export const sectionFieldsets = [
  {
    name: 'advanced',
    title: 'Advanced',
    group: 'design',
    options: { collapsible: true, collapsed: true },
  },
]

/** What a section starts with when an editor adds it. Unset fields keep the section's own look. */
export type SectionStyleInitialValue = Partial<
  Record<'tone' | 'spacing' | 'width' | 'align' | 'motion', string>
>

export interface SectionFormOptions {
  /**
   * Which options suit which layout, registered under the section's `_type`. Without it the section
   * has no picture (no Parallax) and every other option is offered.
   */
  rules?: SectionFormRules & { type: string }
  /**
   * Agency-only fields for the Advanced fieldset. Each is shown only while its own `hidden` says so;
   * the fieldset disappears when none are, and for clients.
   */
  advanced?: FieldDefinition[]
}

function hiddenFor(own: ConditionalProperty | undefined): ConditionalPropertyCallback {
  return (context) =>
    hiddenFromClients(context) || (typeof own === 'function' ? own(context) : (own ?? false))
}

/**
 * A section's `fields`, in the order editors meet them: the layout picker (`variant`) first, because
 * the layout decides which fields matter, then the section's own fields in the Content group, then
 * the shared `style` in Design (agency only), then any `advanced` fields. `initial` sets how this kind
 * of section starts (a hero starts dark); pass the same values to SectionFrame's `defaults` so a
 * section without a style looks like a new one. Add `fieldsets: sectionFieldsets` to the type.
 */
export function sectionFields(
  content: FieldDefinition[],
  initial: SectionStyleInitialValue = {},
  { rules, advanced = [] }: SectionFormOptions = {},
): FieldDefinition[] {
  if (rules) registerSectionRules(rules.type, rules)

  const layout = content.filter((field) => field.name === 'variant')
  const rest = content.filter((field) => field.name !== 'variant')

  return [
    // A field that names its own group keeps it.
    ...[...layout, ...rest].map((field) => ({ ...field, group: field.group ?? 'content' })),
    defineField({
      name: 'style',
      title: 'Design',
      type: 'sectionStyle',
      group: 'design',
      hidden: hiddenFromClients,
      initialValue: initial,
    }),
    ...advanced.map((field) => ({
      ...field,
      group: 'design',
      fieldset: 'advanced',
      hidden: hiddenFor(field.hidden),
    })),
  ]
}
