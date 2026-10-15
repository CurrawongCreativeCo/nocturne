import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in max-w-measure-narrow.
  title: 60,
  // text-lead in max-w-measure-narrow: about four lines.
  text: 200,
} as const

export const formSection = defineType({
  name: 'formSection',
  title: 'Form',
  type: 'object',
  icon: EnvelopeIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Section title',
        type: 'string',
        validation: (rule) => lengthWarning(rule, LIMITS.title, 'Headings'),
      }),
      defineField({
        name: 'text',
        title: 'Intro',
        type: 'text',
        rows: 3,
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Intro text'),
      }),
      defineField({
        name: 'form',
        type: 'reference',
        to: [{ type: 'form' }],
        description: 'Create forms under Forms in the sidebar. One form can be used on many pages.',
        validation: (rule) => rule.required(),
      }),
      accessField,
    ],
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title', form: 'form.title', tone: 'style.tone' },
    prepare: ({ title, form, tone }: { title?: string; form?: string; tone?: string }) => ({
      title: title || form || 'Form',
      subtitle: joinSubtitle('Form', form ?? 'none chosen', toneTitle(tone)),
    }),
  },
})
