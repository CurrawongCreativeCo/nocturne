import { ImagesIcon } from '@sanity/icons/Images'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // A single line of small text above the logos.
  title: 60,
} as const

export const logoCloud = defineType({
  name: 'logoCloud',
  title: 'Logo strip',
  type: 'object',
  icon: ImagesIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        description: 'e.g. "Trusted by teams at"',
        validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
      }),
      defineField({
        name: 'logos',
        type: 'array',
        validation: (rule) => rule.required().min(1),
        of: [
          defineArrayMember({
            name: 'logo',
            type: 'object',
            fields: [
              defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
              imageField({
                name: 'image',
                requireAlt: false,
                description: 'SVG or transparent PNG.',
                preferSvg: true,
                minWidth: 400,
                validation: (rule) => rule.required(),
              }),
              defineField({ name: 'url', title: 'Link', type: 'url' }),
            ],
            preview: { select: { title: 'name', media: 'image' } },
          }),
        ],
      }),
      accessField,
    ],
    { spacing: 'compact', align: 'center', motion: 'none' },
  ),
  preview: {
    select: { title: 'title', logos: 'logos', tone: 'style.tone' },
    prepare: ({ title, logos, tone }: { title?: string; logos?: unknown[]; tone?: string }) => ({
      title: title || 'Logo strip',
      subtitle: joinSubtitle('Logo strip', `${logos?.length ?? 0} logos`, toneTitle(tone)),
    }),
  },
})
