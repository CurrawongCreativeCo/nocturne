import { defineField, type ConditionalPropertyCallback } from 'sanity'

import { WORDMARK_SIZES, WORDMARK_SIZE_TITLES } from '../wordmark-options'

interface TextOrImageConfig {
  /** `name` gives `nameDisplay` and `nameImage`. */
  prefix: string
  /** What the text is, for the descriptions: "the name", "the heading". */
  what: string
  /** The field holding the text, so the image's check can ask for it. */
  textField: string
  /** Whether the text field holds Portable Text (a heading) rather than a string. */
  richText?: boolean
  hidden?: ConditionalPropertyCallback
}

const hasText = (value: unknown, richText: boolean) =>
  richText
    ? Array.isArray(value) &&
      value.some((block: { children?: { text?: string }[] }) =>
        block.children?.some((child) => child.text?.trim()),
      )
    : typeof value === 'string' && value.trim() !== ''

/**
 * Two fields that let a brand-led piece of text show as a picture: a Text / Image choice (Text is the
 * default) and, only once Image is chosen, the picture and its size. The text field stays and is
 * still needed: it is the picture's alt text, so the heading keeps its words for screen readers and
 * search engines. The site draws it with `Wordmark` (components/ui/wordmark.tsx).
 */
export function textOrImageFields({
  prefix,
  what,
  textField,
  richText = false,
  hidden,
}: TextOrImageConfig) {
  const displayName = `${prefix}Display`
  const isText = ({ parent }: { parent?: Record<string, unknown> }) =>
    parent?.[displayName] !== 'image'

  return [
    defineField({
      name: displayName,
      title: 'Show as',
      type: 'string',
      description: `Text is best for most sites. Image shows a wordmark or lettering in place of ${what}; the text above is still read by screen readers and search engines.`,
      initialValue: 'text',
      options: {
        list: [
          { value: 'text', title: 'Text' },
          { value: 'image', title: 'Image' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      hidden,
    }),
    defineField({
      name: `${prefix}Image`,
      title: 'Image',
      type: 'image',
      description:
        'A PNG, SVG or WebP with a transparent background works best. It is shown whole, never cropped.',
      options: { accept: 'image/png,image/svg+xml,image/webp,image/jpeg' },
      hidden: (context) =>
        isText(context as { parent?: Record<string, unknown> }) ||
        (hidden ? hidden(context) : false),
      fields: [
        defineField({
          name: 'size',
          title: 'Size',
          type: 'string',
          initialValue: 'medium',
          options: {
            list: WORDMARK_SIZES.map((value) => ({ value, title: WORDMARK_SIZE_TITLES[value] })),
            layout: 'radio',
            direction: 'horizontal',
          },
        }),
      ],
      validation: (rule) =>
        rule
          .custom((value, { parent }) => {
            const section = parent as Record<string, unknown> | undefined
            if (section?.[displayName] !== 'image') return true
            if (!(value as { asset?: unknown } | undefined)?.asset) {
              return `Add the image, or choose Text. Until then ${what} shows as text.`
            }
            return hasText(section[textField], richText)
              ? true
              : `Type ${what} as text too: it becomes the image's description for screen readers and search engines.`
          })
          .warning(),
    }),
  ]
}
