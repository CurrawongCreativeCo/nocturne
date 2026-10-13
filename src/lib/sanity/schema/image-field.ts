import { defineField, type ImageDefinition, type ImageOptions } from 'sanity'

import { getAutoAltText } from './auto-alt-text'

/**
 * Options shared by every image: hotspot, plus Sanity AI Assist writing the alt text from the
 * picture. Manual by default: an editor picks "Generate image description" on the alt field. The
 * "AI settings" Studio tool can switch on automatic runs on upload (each run spends AI credits); the
 * getter is read live by the plugin. Inert where AI Assist isn't available (see README).
 */
export const imageOptions = {
  hotspot: true,
  aiAssist: {
    imageDescriptionField: {
      path: 'alt',
      get updateOnImageChange() {
        return getAutoAltText()
      },
    },
  },
} satisfies ImageOptions

/**
 * Alt text field for any image. With `required`, publishing is blocked while an image is set
 * but has no alt text. Shared by `imageField` and rich-text images.
 */
export function altField({ required }: { required: boolean }) {
  return defineField({
    name: 'alt',
    title: 'Alternative text',
    type: 'string',
    description: 'Describe the image for screen readers. Leave empty only if decorative.',
    validation: (rule) =>
      required
        ? rule.custom((alt, { parent }) =>
            (parent as { asset?: unknown } | undefined)?.asset && !alt
              ? 'Alt text is required'
              : true,
          )
        : rule,
  })
}

/**
 * Field factory for images with hotspot + required alt text. A factory (rather
 * than a named object type) keeps the stored shape a plain `image`, so
 * @sanity/image-url and Studio's image tooling work unchanged.
 */
export function imageField(
  overrides: Omit<ImageDefinition, 'type'> & { requireAlt?: boolean; group?: string | string[] },
) {
  const { requireAlt = true, fields = [], ...rest } = overrides
  return defineField({
    type: 'image',
    options: imageOptions,
    ...rest,
    fields: [altField({ required: requireAlt }), ...fields],
  })
}
