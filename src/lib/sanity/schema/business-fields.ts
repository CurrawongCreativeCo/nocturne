import {
  defineArrayMember,
  defineField,
  type ConditionalPropertyCallback,
  type CustomValidator,
  type ObjectRule,
  type StringRule,
  type ValidationBuilder,
} from 'sanity'

import { DAYS, formatTime, isTime, DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import { TIME_ZONES } from '@/lib/time-zones'

/**
 * The address, time zone, opening hours, special days and map coordinates of a place, shared by the
 * Business info singleton and `location` documents so an address, hours row or time zone is entered
 * and validated the same way everywhere. `extra` is merged last: a fieldset, a `hidden` rule or a
 * description of its own.
 */
export interface FieldExtra {
  fieldset?: string
  hidden?: ConditionalPropertyCallback
  description?: string
}

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

export function addressField(
  extra: FieldExtra & { validation?: ValidationBuilder<ObjectRule, Record<string, unknown>> } = {},
) {
  return defineField({
    name: 'address',
    type: 'object',
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
    ...extra,
  })
}

export function timeZoneField(
  extra: FieldExtra & { validation?: ValidationBuilder<StringRule, string> } = {},
) {
  return defineField({
    name: 'timeZone',
    title: 'Time zone',
    type: 'string',
    description: 'Where you trade. It decides when the "Open now" badge says you are open.',
    initialValue: DEFAULT_TIME_ZONE,
    options: {
      list: TIME_ZONES.map(({ value, title }) => ({ value, title })),
      layout: 'dropdown',
    },
    validation: (rule) => rule.required(),
    ...extra,
  })
}

export function openingHoursField(extra: FieldExtra = {}) {
  return defineField({
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
    ...extra,
  })
}

export function specialHoursField(extra: FieldExtra = {}) {
  return defineField({
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
    ...extra,
  })
}

export function geoField(extra: FieldExtra = {}) {
  return defineField({
    name: 'geo',
    title: 'Map coordinates',
    type: 'object',
    description: 'Optional. Latitude and longitude, for example -33.8688 and 151.2093 for Sydney.',
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
    ...extra,
  })
}
