import { LaunchIcon } from '@sanity/icons/Launch'
import { defineField, defineType } from 'sanity'

/** Editor-facing names for the stored button styles: what each looks like, not the code's word for it. */
const CTA_STYLE_TITLES: Record<string, string> = {
  primary: 'Filled',
  secondary: 'Outline',
}

export const cta = defineType({
  name: 'cta',
  title: 'Call to action',
  type: 'object',
  icon: LaunchIcon,
  fields: [
    defineField({ name: 'label', type: 'string', validation: (rule) => rule.required().max(40) }),
    defineField({ name: 'link', type: 'link', validation: (rule) => rule.required() }),
    defineField({
      name: 'variant',
      title: 'Button style',
      description: 'Filled for the main action. Use Outline for a second button beside it.',
      type: 'string',
      initialValue: 'primary',
      options: {
        list: Object.entries(CTA_STYLE_TITLES).map(([value, title]) => ({ title, value })),
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'label', variant: 'variant' },
    prepare: ({ title, variant }: { title?: string; variant?: string }) => ({
      title: title || 'Untitled button',
      subtitle: CTA_STYLE_TITLES[variant ?? 'primary'] ?? variant,
    }),
  },
})
