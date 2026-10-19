import { defineArrayMember, defineField, defineType } from 'sanity'

import { OFFERED_GRADIENTS } from '@/config/heading-gradients'
import { emphasisContrastProblems } from '@/lib/color/heading-contrast'
import {
  CUSTOM_GRADIENT,
  DEFAULT_GRADIENT_ANGLE,
  MAX_CUSTOM_STOPS,
  MIN_CUSTOM_STOPS,
  brandColoursSlug,
} from '@/lib/color/heading-gradient'
import { HEX_PATTERN } from '@/lib/color/oklch'
import { emphasisPhrases, headingPlainText, headingTone } from '@/lib/sanity/heading-text'

import { DEFAULT_BRAND_COLOURS, fetchBrandColours } from './brand-colours'
import { fetchBrandGradients } from './brand-gradients'
import { lengthMessage, lengthWarning } from './length-guidance'
import { presetField } from './preset-field'
import {
  EmphasisBrandThumbnail,
  EmphasisColourThumbnail,
  EmphasisPlainThumbnail,
  EmphasisCustomGradientThumbnail,
  EmphasisGradientThumbnail,
  EmphasisHighlightThumbnail,
  EmphasisUnderlineThumbnail,
  gradientThumbnail,
} from './thumbnails/emphasis-thumbnails'

/** More highlighted phrases than this and nothing stands out any more. */
export const MAX_EMPHASIS_PHRASES = 2

export const EMPHASIS_OPTIONS = [
  {
    value: 'brand',
    title: 'Brand colour',
    description: 'The words in the brand colour.',
    thumbnail: EmphasisBrandThumbnail,
  },
  {
    value: 'colour',
    title: 'Solid colour',
    description: 'Any colour you choose, not limited to the brand palette.',
    thumbnail: EmphasisColourThumbnail,
  },
  {
    value: 'gradient',
    title: 'Gradient',
    description: 'A blend of colours across the words.',
    thumbnail: EmphasisGradientThumbnail,
  },
  {
    value: 'highlight',
    title: 'Highlight colour',
    description: 'A soft marker behind the words.',
    thumbnail: EmphasisHighlightThumbnail,
  },
  {
    value: 'underline',
    title: 'Underline',
    description: 'A line under the words.',
    thumbnail: EmphasisUnderlineThumbnail,
  },
  {
    value: 'plain',
    title: 'Bold or italic only',
    description: 'No colour change: heavier or slanted words. Turn on Bold or Italic below.',
    thumbnail: EmphasisPlainThumbnail,
  },
] as const

/**
 * The built-in choices, after the Brand colours gradients the Studio adds in front of them (see
 * features/studio/components/gradient-picker/heading-gradient-input). Brand to green and Brand to
 * red are not offered: they use the success and danger colours. Content that stored them still
 * draws and is still checked (config/heading-gradients.ts).
 */
export const GRADIENT_OPTIONS = [
  ...OFFERED_GRADIENTS.map((gradient) => ({
    value: gradient.value,
    title: gradient.title,
    description: gradient.description,
    thumbnail: gradientThumbnail(gradient),
  })),
  {
    value: CUSTOM_GRADIENT,
    title: 'Custom',
    description: 'Pick your own two or three colours. They are not limited to the brand palette.',
    thumbnail: EmphasisCustomGradientThumbnail,
  },
]

interface EmphasisParent {
  treatment?: string
  gradient?: string
  colour?: string
  bold?: boolean
  italic?: boolean
}

const isGradient = ({ parent }: { parent?: EmphasisParent }) => parent?.treatment === 'gradient'
const isCustom = ({ parent }: { parent?: EmphasisParent }) =>
  parent?.treatment === 'gradient' && parent.gradient === CUSTOM_GRADIENT

/**
 * A heading with highlighted words, as Portable Text: one block, plain style, no lists, no decorators.
 * The only formatting is the `emphasis` annotation: an editor selects words and picks how they
 * stand out (a colour, a gradient, a marker, an underline), and whether they are bold or italic. Bold and
 * italic are fields of the annotation, not `<strong>`/`<em>`, so a screen reader still announces just the words. Use through `headingField` (below) so the length and contrast warnings apply, and
 * render with `<RichHeading>` (components/ui/rich-heading.tsx). Query it as `heading` plus
 * `"headingPlain": pt::text(heading)`; the plain text is for metadata, search, the share image and aria.
 */
export const headingText = defineType({
  name: 'headingText',
  title: 'Heading',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{ title: 'Normal', value: 'normal' }],
      lists: [],
      marks: {
        decorators: [],
        annotations: [
          defineArrayMember({
            name: 'emphasis',
            title: 'Highlight',
            type: 'object',
            validation: (rule) =>
              rule.custom((value) => {
                const mark = value as EmphasisParent | undefined
                return mark?.treatment === 'plain' && !mark.bold && !mark.italic
                  ? 'Turn on Bold or Italic, or pick another look: this one changes nothing on its own.'
                  : true
              }),
            fieldsets: [
              {
                name: 'advanced',
                title: 'Advanced',
                options: { collapsible: true, collapsed: true },
              },
            ],
            fields: [
              presetField({
                name: 'treatment',
                title: 'How it stands out',
                options: EMPHASIS_OPTIONS,
              }),
              defineField({
                name: 'colour',
                title: 'Colour',
                type: 'string',
                description:
                  "Any colour works; the check below warns when it is hard to read on the section's background.",
                options: { headingStop: true },
                hidden: ({ parent }: { parent?: EmphasisParent }) => parent?.treatment !== 'colour',
                validation: (rule) =>
                  rule.custom((value, context) => {
                    const parent = context.parent as EmphasisParent | undefined
                    if (parent?.treatment !== 'colour') return true
                    return typeof value === 'string' && HEX_PATTERN.test(value)
                      ? true
                      : 'Choose a colour, as six-digit hex such as #3266e4.'
                  }),
              }),
              // Weight and slant go with any look, so "bold brand colour" is one highlight.
              defineField({
                name: 'bold',
                title: 'Bold',
                type: 'boolean',
                initialValue: false,
              }),
              defineField({
                name: 'italic',
                title: 'Italic',
                type: 'boolean',
                initialValue: false,
              }),
              // Only the Gradient treatment has a choice to make. The Studio draws this as one picker
              // (heading-gradient-input): Brand colours gradients, Brand to ink, then Custom.
              defineField({
                name: 'gradient',
                title: 'Gradient',
                type: 'string',
                initialValue: OFFERED_GRADIENTS[0]?.value,
                options: {
                  headingGradientPicker: true,
                  list: GRADIENT_OPTIONS.map((option) => ({ ...option })),
                  layout: 'radio',
                },
                hidden: ({ parent }: { parent?: EmphasisParent }) => !isGradient({ parent }),
              }),
              defineField({
                name: 'stops',
                title: 'Colours',
                type: 'array',
                description: `${MIN_CUSTOM_STOPS} or ${MAX_CUSTOM_STOPS} colours, in order. Any colour works; the check below warns when one is hard to read on the section's background.`,
                of: [defineField({ name: 'stop', type: 'string', options: { headingStop: true } })],
                hidden: ({ parent }: { parent?: EmphasisParent }) => !isCustom({ parent }),
                validation: (rule) => [
                  rule.custom((stops, context) => {
                    const parent = context.parent as EmphasisParent | undefined
                    if (parent?.gradient !== CUSTOM_GRADIENT) return true
                    const list = (stops as string[] | undefined) ?? []
                    if (list.length < MIN_CUSTOM_STOPS || list.length > MAX_CUSTOM_STOPS) {
                      return `Add ${MIN_CUSTOM_STOPS} or ${MAX_CUSTOM_STOPS} colours.`
                    }
                    return list.every((stop) => HEX_PATTERN.test(stop))
                      ? true
                      : 'Use six-digit hex colours such as #3266e4.'
                  }),
                ],
              }),
              defineField({
                name: 'angle',
                title: 'Angle',
                type: 'number',
                description: 'Direction in degrees: 90 is left to right, 180 top to bottom.',
                fieldset: 'advanced',
                initialValue: DEFAULT_GRADIENT_ANGLE,
                hidden: ({ parent }: { parent?: EmphasisParent }) => !isCustom({ parent }),
                validation: (rule) => rule.integer().min(0).max(360),
              }),
            ],
          }),
        ],
      },
    }),
  ],
  validation: (rule) => [
    rule.max(1).error('A heading is a single line of text. Use one paragraph.'),
    rule
      .custom((value) => {
        const count = emphasisPhrases(value as Parameters<typeof emphasisPhrases>[0]).length
        return count > MAX_EMPHASIS_PHRASES
          ? `More than ${MAX_EMPHASIS_PHRASES} highlighted phrases dilute the effect. Fewer reads better.`
          : true
      })
      .warning(),
  ],
})

interface HeadingFieldConfig {
  name: string
  title?: string
  description?: string
  /** Longest text the design handles, in characters of plain text. */
  max: number
  /** The section's tone when its style is unset, so the contrast check matches what renders. */
  defaultTone?: string
  /** Heading text still comes from another (old) field while content migrates: it satisfies "required". */
  requiredUnless?: string
  /** The heading may be empty (the section then shows none). */
  optional?: boolean
  /** Words a new section starts with, as plain text. */
  initialText?: string
}

/**
 * A `headingText` field with the length warning (over `max` characters of plain text) and a contrast
 * warning for each treatment (and each custom or Brand colours gradient stop) that fails 3:1 on the
 * section's background. The tone is read from the enclosing section's `style.tone`.
 */
export function headingField({
  name,
  title,
  description,
  max,
  defaultTone = 'surface',
  requiredUnless,
  optional = false,
  initialText,
}: HeadingFieldConfig) {
  return defineField({
    name,
    title,
    description,
    type: 'headingText',
    initialValue: initialText
      ? [
          {
            _type: 'block',
            _key: `${name}-block`,
            style: 'normal',
            markDefs: [],
            children: [{ _type: 'span', _key: `${name}-text`, text: initialText, marks: [] }],
          },
        ]
      : undefined,
    validation: (rule) => [
      rule.custom((value, context) => {
        if (optional) return true
        const parent = context.parent as Record<string, unknown> | undefined
        const hasText = headingPlainText(value as Parameters<typeof headingPlainText>[0]).trim()
        const fallback = requiredUnless ? parent?.[requiredUnless] : undefined
        return hasText || fallback ? true : 'Add a heading.'
      }),
      rule
        .custom((value) =>
          headingPlainText(value as Parameters<typeof headingPlainText>[0]).length > max
            ? lengthMessage('Headings', max)
            : true,
        )
        .warning(),
      rule
        .custom(async (value, context) => {
          const parent = context.parent as Parameters<typeof headingTone>[0]
          const phrases = emphasisPhrases(value as Parameters<typeof emphasisPhrases>[0])
          // The Brand colours gradients are fetched only when a phrase picked one by name.
          const usesBrand = phrases.some(
            (phrase) =>
              phrase.treatment === 'gradient' && brandColoursSlug(phrase.gradient) !== null,
          )
          const brand = usesBrand
            ? await fetchBrandGradients(context.getClient({ apiVersion: '2025-01-01' }))
            : []
          // Measured on the site's colours after its Brand colours, as the page draws them.
          const { colours } =
            phrases.length > 0
              ? await fetchBrandColours(context.getClient({ apiVersion: '2025-01-01' }))
              : DEFAULT_BRAND_COLOURS
          const [worst] = emphasisContrastProblems(
            headingTone(parent, defaultTone),
            phrases,
            brand,
            colours,
          )
          return worst ? worst.message : true
        })
        .warning(),
    ],
  })
}

/**
 * The old plain-text title of a section whose heading is now `headingText`. Read until the
 * "Section titles to heading text" migration has run (migrations/README.md); only content that
 * still has one shows it.
 */
export function legacyTitleField(max: number) {
  return defineField({
    name: 'title',
    title: 'Title (old)',
    type: 'string',
    deprecated: {
      reason: 'Replaced by the heading above. Kept until the content migration has run.',
    },
    readOnly: true,
    hidden: ({ parent }: { parent?: { title?: string } }) => !parent?.title,
    validation: (rule) => lengthWarning(rule, max, 'Headings'),
  })
}
