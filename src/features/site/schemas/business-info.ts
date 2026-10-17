import { HomeIcon } from '@sanity/icons/Home'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ConditionalPropertyCallback,
  type CustomValidator,
} from 'sanity'

import { DAYS, DEFAULT_TIME_ZONE, formatTime, isTime } from '@/lib/opening-hours'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { SOCIAL_PLATFORMS, socialPlatformTitle } from '@/lib/social-platforms'
import { TIME_ZONES } from '@/lib/time-zones'

import { AbnInput } from '../components/abn-input'
import { formatAbn, isValidAbn } from '../utils/abn'
import { parseAuPhone } from '../utils/phone'

/** schema.org types a business can pick without knowing schema.org. "Other" lets the agency name any other. */
export const BUSINESS_TYPES = [
  { value: 'LocalBusiness', title: 'Local business (general)' },
  { value: 'ProfessionalService', title: 'Professional service' },
  { value: 'MedicalBusiness', title: 'Medical business' },
  { value: 'Dentist', title: 'Dentist' },
  { value: 'LegalService', title: 'Legal service' },
  { value: 'Restaurant', title: 'Restaurant' },
  { value: 'Store', title: 'Store' },
  { value: 'HomeAndConstructionBusiness', title: 'Home and construction' },
  { value: 'HealthAndBeautyBusiness', title: 'Health and beauty' },
  { value: 'Other', title: 'Other (name a schema.org type)' },
] as const

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

const TIME_HELP = '24-hour time, for example 08:00 or 17:30.'

/** 24-hour "HH:MM" text; the stored value is what the site and structured data read. */
function timeField(name: 'opens' | 'closes', title: string, hidden: ConditionalPropertyCallback) {
  return defineField({
    name,
    title,
    type: 'string',
    description: TIME_HELP,
    hidden,
    validation: (rule) =>
      rule.custom((value, { parent }) => {
        if ((parent as { closed?: boolean } | undefined)?.closed) return true
        if (!value) return `Enter when you ${name === 'opens' ? 'open' : 'close'}`
        if (!isTime(value)) return 'Use 24-hour time like 08:00 or 17:30'
        const { opens } = (parent as { opens?: string } | undefined) ?? {}
        return name === 'closes' && isTime(opens) && value <= opens
          ? `Closing time must be after opening time (${formatTime(opens)})`
          : true
      }),
  })
}

const hiddenWhenClosed: ConditionalPropertyCallback = ({ parent }) =>
  Boolean((parent as { closed?: boolean } | undefined)?.closed)

/** An address needs a suburb, state and postcode once any part of it is filled in. */
function requiredWithAddress(label: string): CustomValidator<string | undefined> {
  return (value, { parent }) => {
    const address = (parent ?? {}) as Record<string, unknown>
    const started = ['street', 'suburb', 'state', 'postcode'].some((key) => address[key])
    return started && !value ? `Enter the ${label}` : true
  }
}

/** A singleton: the one document has `_id === 'businessInfo'` (see SINGLETON_TYPES and the desk structure). */
export const businessInfo = defineType({
  name: 'businessInfo',
  title: 'Business info',
  type: 'document',
  icon: HomeIcon,
  description:
    'Your business details, written once and used in the footer, on contact details and in the information search engines show about you (name, address, phone, opening hours). Leave anything you do not want to publish empty.',
  fieldsets: [
    { name: 'contact', title: 'Contact' },
    { name: 'address', title: 'Address' },
    {
      name: 'advanced',
      title: 'Advanced',
      options: { collapsible: true, collapsed: true },
      hidden: hiddenFromClients,
    },
  ],
  fields: [
    defineField({
      name: 'tradingName',
      title: 'Trading name',
      type: 'string',
      description: 'The name customers know you by.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'legalName',
      title: 'Legal name',
      type: 'string',
      description:
        'Optional. The registered name if it differs, for example "Smith Holdings Pty Ltd".',
    }),
    defineField({
      name: 'abn',
      title: 'ABN',
      type: 'string',
      description: 'Optional. 11 digits; shown in the footer as "12 345 678 901".',
      components: { input: AbnInput },
      validation: (rule) =>
        rule.custom((value) =>
          !value || isValidAbn(value)
            ? true
            : 'That is not a valid ABN. Check the 11 digits against abr.business.gov.au.',
        ),
    }),
    defineField({
      name: 'phone',
      type: 'string',
      fieldset: 'contact',
      description: 'Australian number, for example (02) 9876 5432, 0412 345 678 or 1300 123 456.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || parseAuPhone(value)
            ? true
            : 'Enter an Australian phone number, area code first',
        ),
    }),
    defineField({
      name: 'publicEmail',
      title: 'Public email',
      type: 'string',
      fieldset: 'contact',
      description: 'Shown on the site, so use an address you are happy to receive enquiries on.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email address',
        ),
    }),
    defineField({
      name: 'address',
      type: 'object',
      fieldset: 'address',
      description:
        'Leave the street empty if customers should not visit you (for example a mobile service): the suburb, state and postcode are still published.',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'street', title: 'Street address', type: 'string' }),
        defineField({
          name: 'suburb',
          type: 'string',
          validation: (rule) => rule.custom(requiredWithAddress('suburb')),
        }),
        defineField({
          name: 'state',
          type: 'string',
          options: { list: [...AU_STATES], layout: 'dropdown' },
          validation: (rule) => rule.custom(requiredWithAddress('state')),
        }),
        defineField({
          name: 'postcode',
          type: 'string',
          description: '4 digits.',
          validation: (rule) => [
            rule.custom(requiredWithAddress('postcode')),
            rule.custom((value) =>
              !value || /^\d{4}$/.test(value) ? true : 'A postcode is 4 digits',
            ),
          ],
        }),
        defineField({
          name: 'country',
          type: 'string',
          initialValue: 'Australia',
          readOnly: true,
          description: 'This template is set up for Australian businesses.',
        }),
      ],
    }),
    defineField({
      name: 'timeZone',
      title: 'Time zone',
      type: 'string',
      fieldset: 'address',
      description: 'Where you trade. It decides when the "Open now" badge says you are open.',
      initialValue: DEFAULT_TIME_ZONE,
      options: {
        list: TIME_ZONES.map(({ value, title }) => ({ value, title })),
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening hours',
      type: 'array',
      description:
        'Add a row for each set of days with the same hours (for example Monday to Friday). Days without a row show as closed. Two rows for the same day make a split shift (a lunch break).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'hoursRow',
          title: 'Hours',
          fields: [
            defineField({
              name: 'days',
              type: 'array',
              of: [defineArrayMember({ type: 'string' })],
              options: {
                list: DAYS.map(({ value, long }) => ({ value, title: long })),
                layout: 'grid',
              },
              validation: (rule) => rule.required().min(1).unique(),
            }),
            defineField({
              name: 'closed',
              title: 'Closed on these days',
              type: 'boolean',
              initialValue: false,
              description: 'Use this to close days that another row would otherwise open.',
            }),
            timeField('opens', 'Opens', hiddenWhenClosed),
            timeField('closes', 'Closes', hiddenWhenClosed),
          ],
          preview: {
            select: { days: 'days', opens: 'opens', closes: 'closes', closed: 'closed' },
            prepare: ({
              days,
              opens,
              closes,
              closed,
            }: {
              days?: string[]
              opens?: string
              closes?: string
              closed?: boolean
            }) => ({
              title: DAYS.filter(({ value }) => days?.includes(value))
                .map(({ short }) => short)
                .join(', '),
              subtitle:
                closed || !isTime(opens) || !isTime(closes)
                  ? 'Closed'
                  : `${formatTime(opens)} – ${formatTime(closes)}`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'specialHours',
      title: 'Public holidays and special days',
      type: 'array',
      description:
        'One-off changes to the hours above, for example Christmas Day. Days that have passed disappear from the site by themselves.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'specialDay',
          title: 'Special day',
          fields: [
            defineField({
              name: 'date',
              type: 'date',
              options: { dateFormat: 'DD MMM YYYY' },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'closed',
              title: 'Closed all day',
              type: 'boolean',
              initialValue: true,
            }),
            timeField('opens', 'Opens', hiddenWhenClosed),
            timeField('closes', 'Closes', hiddenWhenClosed),
            defineField({
              name: 'note',
              type: 'string',
              description: 'Optional, for example "Christmas Day".',
              validation: (rule) => rule.max(60),
            }),
          ],
          preview: {
            select: {
              date: 'date',
              note: 'note',
              closed: 'closed',
              opens: 'opens',
              closes: 'closes',
            },
            prepare: ({
              date,
              note,
              closed,
              opens,
              closes,
            }: {
              date?: string
              note?: string
              closed?: boolean
              opens?: string
              closes?: string
            }) => ({
              title: [date, note].filter(Boolean).join(' · ') || 'Special day',
              subtitle:
                closed || !isTime(opens) || !isTime(closes)
                  ? 'Closed'
                  : `${formatTime(opens)} – ${formatTime(closes)}`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'serviceAreas',
      title: 'Service areas',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      description: 'Suburbs or regions you travel to, for example "Inner West" or "Newcastle".',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      description: 'Search engines use these to connect your website with your profiles.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              options: {
                list: SOCIAL_PLATFORMS.map(({ value, title }) => ({ value, title })),
                layout: 'dropdown',
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Link',
              type: 'url',
              validation: (rule) =>
                rule
                  .required()
                  .uri({ scheme: ['https'] })
                  .error('Use a full https:// link'),
            }),
          ],
          preview: {
            select: { platform: 'platform', url: 'url' },
            prepare: ({ platform, url }: { platform?: string; url?: string }) => ({
              title: socialPlatformTitle(platform),
              subtitle: url,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'businessType',
      title: 'Business type',
      type: 'string',
      fieldset: 'advanced',
      description:
        'How search engines classify the business. Pick the closest; "Local business" is always safe.',
      initialValue: 'LocalBusiness',
      options: {
        list: BUSINESS_TYPES.map(({ value, title }) => ({ value, title })),
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'businessTypeOther',
      title: 'Other business type',
      type: 'string',
      fieldset: 'advanced',
      description:
        'A schema.org type name, written exactly, for example Optician, Physiotherapy or AutoRepair (see schema.org/LocalBusiness for the list).',
      hidden: ({ parent }) =>
        (parent as { businessType?: string } | undefined)?.businessType !== 'Other',
      validation: (rule) =>
        rule.custom((value, { parent }) => {
          if ((parent as { businessType?: string } | undefined)?.businessType !== 'Other')
            return true
          return value && /^[A-Z][A-Za-z]+$/.test(value)
            ? true
            : 'Enter one schema.org type name, capitalised, with no spaces (for example Optician)'
        }),
    }),
    defineField({
      name: 'geo',
      title: 'Map coordinates',
      type: 'object',
      fieldset: 'advanced',
      description:
        'Optional. Latitude and longitude, for example -33.8688 and 151.2093 for Sydney.',
      options: { columns: 2 },
      fields: [
        defineField({
          name: 'lat',
          title: 'Latitude',
          type: 'number',
          validation: (rule) => [
            rule.min(-90).max(90),
            rule.custom((value, { parent }) =>
              value === undefined && (parent as { lng?: number } | undefined)?.lng !== undefined
                ? 'Enter the latitude as well'
                : true,
            ),
            rule
              .custom((value) =>
                value !== undefined && (value > -9 || value < -44)
                  ? 'Australian latitudes are between -44 and -9'
                  : true,
              )
              .warning(),
          ],
        }),
        defineField({
          name: 'lng',
          title: 'Longitude',
          type: 'number',
          validation: (rule) => [
            rule.min(-180).max(180),
            rule.custom((value, { parent }) =>
              value === undefined && (parent as { lat?: number } | undefined)?.lat !== undefined
                ? 'Enter the longitude as well'
                : true,
            ),
          ],
        }),
      ],
    }),
    defineField({
      name: 'priceRange',
      title: 'Price range',
      type: 'string',
      fieldset: 'advanced',
      description: 'Optional. A rough guide for search results.',
      options: {
        list: [
          { value: '$', title: '$ (budget)' },
          { value: '$$', title: '$$ (moderate)' },
          { value: '$$$', title: '$$$ (upmarket)' },
          { value: '$$$$', title: '$$$$ (premium)' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
  ],
  preview: {
    select: { name: 'tradingName', abn: 'abn' },
    prepare: ({ name, abn }: { name?: string; abn?: string }) => ({
      title: name || 'Business info',
      subtitle: abn ? `ABN ${formatAbn(abn)}` : undefined,
    }),
  },
})
