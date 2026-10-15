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

export const newsletterSignup = defineType({
  name: 'newsletterSignup',
  title: 'Newsletter signup',
  type: 'object',
  icon: EnvelopeIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        title: 'Heading',
        type: 'string',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'text',
        type: 'text',
        rows: 3,
        validation: (rule) => lengthWarning(rule, LIMITS.text, 'Intro text'),
      }),
      defineField({
        name: 'submitLabel',
        title: 'Button label',
        type: 'string',
        initialValue: 'Subscribe',
        validation: (rule) => rule.required().max(40),
      }),
      defineField({
        name: 'successMessage',
        type: 'text',
        rows: 3,
        description:
          'Shown after signing up. Visitors see it whether or not the address was already subscribed, so it should not say "you are now subscribed". If your provider asks people to confirm by email, say so here.',
        initialValue: 'Thanks! Check your inbox for a message from us.',
        validation: (rule) => rule.required().max(300),
      }),
      accessField,
    ],
    { align: 'start' },
  ),
  preview: {
    select: { title: 'title', tone: 'style.tone' },
    prepare: ({ title, tone }: { title?: string; tone?: string }) => ({
      title: title || 'Untitled',
      subtitle: joinSubtitle('Newsletter signup', toneTitle(tone)),
    }),
  },
})
