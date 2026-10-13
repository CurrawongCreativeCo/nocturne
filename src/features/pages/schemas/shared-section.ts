import { ComponentIcon } from '@sanity/icons/Component'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { sectionTypes } from './sections'

const SECTION_TITLES = new Map<string, string>(sectionTypes.map((type) => [type.name, type.title]))

/** One section that many pages reference, so editing it once updates every page that uses it. */
export const sharedSection = defineType({
  name: 'sharedSection',
  title: 'Shared section',
  type: 'document',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description:
        'Internal name, shown when picking this section on a page. Visitors never see it.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'section',
      type: 'array',
      of: sectionTypes.map(({ name }) => defineArrayMember({ type: name })),
      validation: (rule) => rule.required().length(1),
      options: {
        insertMenu: {
          views: [
            { name: 'grid', previewImageUrl: (type) => `/section-previews/${type}.svg` },
            { name: 'list' },
          ],
        },
      },
    }),
  ],
  preview: {
    select: { title: 'title', type: 'section.0._type' },
    prepare: ({ title, type }: { title?: string; type?: string }) => ({
      title: title || 'Untitled',
      subtitle: type ? (SECTION_TITLES.get(type) ?? type) : 'Empty',
    }),
  },
})
