import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import {
  cardDesignField,
  eyebrowField,
  headerDesignField,
} from '@/lib/sanity/schema/card-design-fields'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  EventsAgendaThumbnail,
  EventsFeaturedThumbnail,
  EventsListThumbnail,
} from '@/lib/sanity/schema/thumbnails/events-thumbnails'

import { eventsCapabilities } from './events-capabilities'
import { EVENTS_MAX_COUNT } from '../../utils/events'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
  label: 30,
} as const

/**
 * One component per variant in components/sections/events/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const EVENTS_VARIANTS = [
  {
    value: 'list',
    title: 'List',
    description: 'The next events, a row each: date, title, place and a link.',
    thumbnail: EventsListThumbnail,
  },
  {
    value: 'agenda',
    title: 'Agenda',
    description: 'Grouped by day, with times in a column. Repeating events show every date.',
    thumbnail: EventsAgendaThumbnail,
  },
  {
    value: 'featured',
    title: 'Featured',
    description: 'The next event large, with its picture, and the ones after it beside it.',
    thumbnail: EventsFeaturedThumbnail,
  },
] as const

/** The text roles every layout draws (events-capabilities.ts), and what each is drawn in. */
export const EVENTS_ROLES = [{ role: 'title' }, { role: 'meta' }, { role: 'body' }] as const
export const EVENTS_ROLE_COLOURS = { title: 'ink', meta: 'muted', body: 'muted' } as const

/** Only the Featured layout draws a card, so only it has a fill, a border and a mark to set. */
const notFeatured: ConditionalPropertyCallback = ({ document, path }) =>
  (sectionAtStylePath(document, path)?.variant ?? 'list') !== 'featured'

/** The Agenda is not linked card by card (137 item 4), so it has no indicator to choose. */
const isAgenda: ConditionalPropertyCallback = ({ document, path }) =>
  (sectionAtStylePath(document, path)?.variant ?? 'list') === 'agenda'

export const events = defineType({
  name: 'events',
  title: 'Events',
  type: 'object',
  icon: CalendarIcon,
  options: { designCapabilities: eventsCapabilities },
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      eyebrowField(),
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'e.g. “What’s on”.',
        max: LIMITS.title,
        optional: true,
        initialText: 'What’s on',
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({ name: 'text', type: 'text', rows: 3 }),
      defineField({
        name: 'seeAllLink',
        title: '“See all events” link',
        type: 'link',
        description:
          'Optional. Where the link at the end goes, usually your page with every event. Empty: no link.',
      }),
      defineField({
        name: 'seeAllLabel',
        title: 'Link text',
        type: 'string',
        initialValue: 'See all events',
        hidden: ({ parent }) => !(parent as { seeAllLink?: unknown } | undefined)?.seeAllLink,
        validation: (rule) => lengthWarning(rule, LIMITS.label, 'Link text'),
      }),
      headerDesignField(),
      cardDesignField({
        description:
          'Text for every layout. Only Featured draws a card, so its fill, border and mark are shown there.',
        roles: EVENTS_ROLES,
        defaults: EVENTS_ROLE_COLOURS,
        inherits: 'the layout’s own',
        surface: { hidden: notFeatured },
        markHidden: notFeatured,
        // The List draws a chevron today, the Featured layout nothing: that is what unset means.
        action: { hidden: isAgenda },
        depth: { hidden: notFeatured },
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(EVENTS_VARIANTS),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components.
    { tone: 'surface', align: 'start' },
    {
      // Agency-only, in the Design tab's collapsed Advanced area.
      advanced: [
        defineField({
          name: 'category',
          title: 'Only show one category',
          type: 'reference',
          to: [{ type: 'eventCategory' }],
          description: 'Empty: events of every category.',
        }),
        defineField({
          name: 'count',
          title: 'Most to show',
          type: 'number',
          description:
            'Empty: the layout’s own number (six rows, ten agenda entries, four featured).',
          validation: (rule) => rule.integer().min(1).max(EVENTS_MAX_COUNT),
        }),
      ],
    },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', variant: 'variant', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      variant,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      variant?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Events',
      subtitle: variantSubtitle('Events', EVENTS_VARIANTS, variant, tone),
    }),
  },
})
