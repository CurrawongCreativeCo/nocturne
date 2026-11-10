import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { eyebrowField, headerDesignField } from '@/lib/sanity/schema/card-design-fields'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

import { formCardField } from './form-card-field'
import { formSectionCapabilities } from './form-section-capabilities'

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
  options: { designCapabilities: formSectionCapabilities },
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      eyebrowField(),
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
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
      headerDesignField(),
      formCardField({
        subject: 'the form',
        unset:
          'Empty draws no card: the form sits on the section. Choosing a fill, border or shadow draws one.',
        colour: 'ink',
      }),
      accessField,
    ],
    { align: 'start' },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', form: 'form.title', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      form,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      form?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || form || 'Form',
      subtitle: joinSubtitle('Form', form ?? 'none chosen', toneTitle(tone)),
    }),
  },
})
