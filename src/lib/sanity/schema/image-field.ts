import { defineField, type ImageDefinition } from 'sanity'

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
    fields: [
      defineField({
        name: 'alt',
        title: 'Alternative text',
        type: 'string',
        description: 'Describe the image for screen readers. Leave empty only if decorative.',
        validation: (rule) =>
          requireAlt
            ? rule.custom((alt, { parent }) =>
                (parent as { asset?: unknown } | undefined)?.asset && !alt
                  ? 'Alt text is required'
                  : true,
              )
            : rule,
      }),
      ...fields,
    ],
  })
}
