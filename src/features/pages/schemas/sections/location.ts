import { PinIcon } from '@sanity/icons/Pin'
import { defineField, defineType, type PreviewValue } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle } from '@/lib/sanity/schema/section-variant'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2 in half the content width.
  title: 60,
  // text-lead in max-w-measure-narrow: about three lines.
  intro: 160,
  // The link's label on one line beside its icon.
  directionsLabel: 30,
} as const

export const location = defineType({
  name: 'location',
  title: 'Location',
  type: 'object',
  icon: PinIcon,
  description:
    'Shows the address, opening hours, phone and email from Business info. Edit those there, once.',
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      defineField({
        name: 'title',
        type: 'string',
        initialValue: 'Visit us',
        validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Headings')],
      }),
      defineField({
        name: 'intro',
        type: 'text',
        rows: 2,
        validation: (rule) => lengthWarning(rule, LIMITS.intro, 'Intro text'),
      }),
      imageField({
        name: 'mapImage',
        title: 'Map image',
        description:
          'A styled map your designer exports. Leave it empty to show the address on a card instead. No map service loads either way.',
        aspect: '4:3',
        minWidth: 1200,
      }),
      defineField({
        name: 'showHours',
        title: 'Show opening hours',
        type: 'boolean',
        initialValue: true,
      }),
      defineField({
        name: 'showOpenNow',
        title: 'Show the “Open now” badge',
        type: 'boolean',
        description: 'Worked out in the visitor’s browser, in your Business info time zone.',
        initialValue: true,
        hidden: ({ parent }) => !(parent as { showHours?: boolean } | undefined)?.showHours,
      }),
      defineField({
        name: 'showContact',
        title: 'Show phone and email',
        type: 'boolean',
        initialValue: true,
      }),
      defineField({
        name: 'directionsLabel',
        title: 'Directions button label',
        type: 'string',
        description: 'Opens Google Maps with directions to your address.',
        initialValue: 'Get directions',
        validation: (rule) => [
          rule.required(),
          lengthWarning(rule, LIMITS.directionsLabel, 'Labels'),
        ],
      }),
      accessField,
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the component.
    { align: 'start' },
    {
      // A picture, when there is one, so Parallax has something to move.
      rules: { type: 'location', hasPicture: (value) => Boolean(value.mapImage) },
      // Agency only, in the Design tab's collapsed Advanced area.
      advanced: [
        defineField({
          name: 'interactiveMap',
          title: 'Offer an interactive map',
          type: 'boolean',
          description:
            'Adds a “Load interactive map” button. Nothing from Google loads until a visitor clicks it, and a note says the map comes from Google.',
          initialValue: false,
        }),
      ],
    },
  ),
  preview: {
    select: { title: 'title', media: 'mapImage', tone: 'style.tone' },
    prepare: ({
      title,
      media,
      tone,
    }: {
      title?: string
      media?: PreviewValue['media']
      tone?: string
    }) => ({
      title: title || 'Location',
      media,
      subtitle: joinSubtitle('Location', toneTitle(tone)),
    }),
  },
})
