import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ConditionalPropertyCallback,
} from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import {
  cardDesignField,
  eyebrowField,
  headerDesignField,
} from '@/lib/sanity/schema/card-design-fields'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { itemStyleField } from '@/lib/sanity/schema/item-appearance'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

import { faqCapabilities } from './faq-capabilities'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced.
  title: 70,
  // text-lead in max-w-measure-narrow: about four lines.
  intro: 200,
} as const

const FAQ_ITEM_STYLES = ['divided', 'cards'] as const

/** The text roles every item style draws (faq-capabilities.ts), and what each is drawn in. */
export const FAQ_ROLES = [{ role: 'title' }, { role: 'body' }] as const
export const FAQ_ROLE_COLOURS = { title: 'ink', body: 'muted' } as const

/** Only the Cards style draws a card, so only it has a fill, a border and a mark to set. */
const notCards: ConditionalPropertyCallback = ({ parent }) =>
  (parent as { itemStyle?: string } | undefined)?.itemStyle !== 'cards'

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  options: { designCapabilities: faqCapabilities },
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
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
      defineField({
        name: 'items',
        title: 'Questions',
        type: 'array',
        validation: (rule) => rule.required().min(1),
        of: [
          defineArrayMember({
            name: 'faqItem',
            type: 'object',
            fields: [
              defineField({
                name: 'question',
                type: 'string',
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: 'answer',
                type: 'blockContent',
                validation: (rule) => rule.required(),
              }),
            ],
            preview: { select: { title: 'question' } },
          }),
        ],
      }),
      headerDesignField(),
      cardDesignField({
        description:
          'Text for every item style. Only Cards draws a card, so its fill, border and mark are shown there.',
        roles: FAQ_ROLES,
        defaults: FAQ_ROLE_COLOURS,
        inherits: 'the item style’s own',
        lead: [
          itemStyleField({
            values: FAQ_ITEM_STYLES,
            titles: { divided: 'Divided list', cards: 'Cards' },
            description:
              'A ruled list, or each question in its own card. Empty is the Divided list.',
          }),
        ],
        surface: { hidden: notCards },
        markHidden: notCards,
      }),
      accessField,
    ],
    { align: 'center' },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', items: 'items', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      items,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      items?: unknown[]
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'FAQ',
      subtitle: joinSubtitle('FAQ', `${items?.length ?? 0} questions`, toneTitle(tone)),
    }),
  },
})
