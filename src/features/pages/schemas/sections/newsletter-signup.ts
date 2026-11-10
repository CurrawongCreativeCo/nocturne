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
import { newsletterSignupCapabilities } from './newsletter-signup-capabilities'

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
  options: { designCapabilities: newsletterSignupCapabilities },
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      eyebrowField(),
      headingField({
        name: 'heading',
        title: 'Heading',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
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
      headerDesignField(),
      formCardField({
        subject: 'the signup form',
        unset:
          'Empty draws no card: the form sits on the section. Choosing a fill, border or shadow draws one.',
        colour: 'ink',
      }),
      accessField,
    ],
    { align: 'start' },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Untitled',
      subtitle: joinSubtitle('Newsletter signup', toneTitle(tone)),
    }),
  },
})
