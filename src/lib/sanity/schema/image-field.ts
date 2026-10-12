import { defineField, type ImageDefinition } from 'sanity'

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
    options: { hotspot: true },
    ...rest,
    fields: [altField({ required: requireAlt }), ...fields],
  })
}
