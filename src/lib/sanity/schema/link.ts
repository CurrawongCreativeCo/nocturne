import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType, type CustomValidator } from 'sanity'

import { LINK_ACTIONS } from '@/config/link-actions'

import { ANCHOR_PATTERN } from '../section-style-options'
import { presetField } from './preset-field'

interface LinkValue {
  linkType?: string
}

const typeIs =
  (...types: string[]) =>
  ({ parent }: { parent?: LinkValue }) =>
    !types.includes(parent?.linkType ?? '')

const requiredWhen =
  (type: string, message: string): CustomValidator =>
  (value, { parent }) =>
    (parent as LinkValue | undefined)?.linkType === type && !value ? message : true

/**
 * What a link does: opens a page, another website, a section of this page, a panel or booking.
 * Reused by CTAs, nav, rich text, etc. `internal` and `external` store exactly what they always
 * did. Panel and booking are offered once their features exist (config/link-actions.ts).
 */
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fieldsets: [
    { name: 'advanced', title: 'Advanced', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    presetField({
      name: 'linkType',
      title: 'Goes to',
      initialValue: 'internal',
      options: [
        { value: 'internal', title: 'A page on this site', description: 'One of your pages.' },
        { value: 'external', title: 'Another website', description: 'A web, email or phone link.' },
        { value: 'anchor', title: 'A section on this page', description: 'Scrolls down or up.' },
        { value: 'panel', title: 'Open a panel', description: 'A pop-up over the page.' },
        { value: 'booking', title: 'Book', description: 'Opens the booking form.' },
      ],
      visibleOptions: () => [
        'internal',
        'external',
        'anchor',
        ...(LINK_ACTIONS.panel ? ['panel'] : []),
        ...(LINK_ACTIONS.booking ? ['booking'] : []),
      ],
    }),
    defineField({
      name: 'internal',
      title: 'Page',
      type: 'reference',
      to: [{ type: 'page' }],
      hidden: typeIs('internal'),
      validation: (rule) => rule.custom(requiredWhen('internal', 'Select a page')),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      hidden: typeIs('external'),
      validation: (rule) =>
        rule
          .uri({ scheme: ['http', 'https', 'mailto', 'tel'] })
          .custom((value, { parent }) =>
            (parent as LinkValue | undefined)?.linkType === 'external' && !value
              ? 'Enter a URL'
              : true,
          ),
    }),
    defineField({
      name: 'anchor',
      title: 'Section',
      description:
        'Pick a section that has an anchor (set in its Layout options), or type one. Only works on the page the link is on.',
      type: 'string',
      options: { anchorPicker: true },
      hidden: typeIs('anchor'),
      validation: (rule) =>
        rule.custom((value, { parent }) => {
          if ((parent as LinkValue | undefined)?.linkType !== 'anchor') return true
          if (!value) return 'Pick or type a section'
          return ANCHOR_PATTERN.test(value)
            ? true
            : 'Start with a letter, then lowercase letters, numbers and single hyphens'
        }),
    }),
    // Panel and booking fields exist only once their features do: a reference to a missing type breaks the schema.
    ...(LINK_ACTIONS.panel
      ? [
          defineField({
            name: 'panel',
            title: 'Panel',
            type: 'reference',
            to: [{ type: 'panel' }],
            hidden: typeIs('panel'),
            validation: (rule) => rule.custom(requiredWhen('panel', 'Select a panel')),
          }),
        ]
      : []),
    defineField({
      name: 'bookingUrl',
      title: 'Booking link (optional)',
      description: 'Leave empty to use the site’s booking settings.',
      type: 'url',
      hidden: typeIs('booking'),
      validation: (rule) => rule.uri({ scheme: ['http', 'https'], allowRelative: true }),
    }),
    defineField({
      name: 'openInNewTab',
      type: 'boolean',
      initialValue: false,
      fieldset: 'advanced',
      hidden: typeIs('external'),
    }),
    defineField({
      name: 'fallbackUrl',
      title: 'Fallback link',
      description:
        'Where the button goes if the panel can’t open (for example, without JavaScript).',
      type: 'url',
      fieldset: 'advanced',
      hidden: typeIs('panel'),
      validation: (rule) => rule.uri({ scheme: ['http', 'https'], allowRelative: true }),
    }),
  ],
})
