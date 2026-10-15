import { defineArrayMember, defineField, defineType } from 'sanity'

import { HEADING_GRADIENTS } from '@/config/heading-gradients'
import { emphasisContrastProblems } from '@/lib/color/heading-contrast'
import { emphasisPhrases, headingPlainText } from '@/lib/sanity/heading-text'

import { lengthMessage } from './length-guidance'
import { presetField } from './preset-field'
import {
  EmphasisBrandThumbnail,
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
] as const

const GRADIENT_OPTIONS = HEADING_GRADIENTS.map((gradient) => ({
  value: gradient.value,
  title: gradient.title,
  description: gradient.description,
  thumbnail: gradientThumbnail(gradient),
}))

/**
 * A heading with highlighted words, as Portable Text: one block, plain style, no lists, no bold or
 * italic. The only formatting is the `emphasis` annotation: an editor selects words and picks how
 * they stand out. Use through `headingField` (below) so the length and contrast warnings apply, and
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
              // Only the Gradient treatment has a choice to make; the first preset is the default.
              presetField({
                name: 'gradient',
                title: 'Gradient',
                options: GRADIENT_OPTIONS,
                required: false,
                fieldset: 'advanced',
                hidden: ({ parent }: { parent?: { treatment?: string } }) =>
                  parent?.treatment !== 'gradient',
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
}

/**
 * A `headingText` field with the length warning (over `max` characters of plain text) and a contrast
 * warning for each treatment that fails 3:1 on the section's background. The tone is read from the
 * enclosing section's `style.tone`.
 */
export function headingField({
  name,
  title,
  description,
  max,
  defaultTone = 'surface',
  requiredUnless,
}: HeadingFieldConfig) {
  return defineField({
    name,
    title,
    description,
    type: 'headingText',
    validation: (rule) => [
      rule.custom((value, context) => {
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
        .custom((value, context) => {
          const parent = context.parent as { style?: { tone?: string } } | undefined
          const phrases = emphasisPhrases(value as Parameters<typeof emphasisPhrases>[0])
          const [worst] = emphasisContrastProblems(parent?.style?.tone ?? defaultTone, phrases)
          return worst ? worst.message : true
        })
        .warning(),
    ],
  })
}
