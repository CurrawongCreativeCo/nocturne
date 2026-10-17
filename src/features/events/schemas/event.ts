import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { formatEventSubtitle } from '@/lib/events/format'
import { DEFAULT_EVENT_TIME_ZONE, resolveTiming } from '@/lib/events/recurrence'
import { daysBetween, localDateKey, parseDateKey } from '@/lib/events/time-zone'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { TIME_ZONES } from '@/lib/time-zones'

import { EVENT_SLUG_PATTERN, slugifyEvent } from '../utils/slug'

/** Longest text the cards fit. Longer text still publishes, with a warning. */
const LIMITS = { title: 80, summary: 200 } as const

export const EVENT_STATUSES = [
  { value: 'scheduled', title: 'Scheduled' },
  { value: 'cancelled', title: 'Cancelled' },
  { value: 'soldOut', title: 'Sold out' },
] as const

interface EventDraft {
  start?: string
  end?: string
  allDay?: boolean
  timeZone?: string
  location?: { kind?: string }
  recurrence?: { repeat?: string; until?: string }
}

/** Slugs an event can't have: `/events/feed.ics` is the calendar feed. */
const RESERVED_SLUGS = ['feed']

export function checkSlug(slug: string | undefined): true | string {
  if (!slug) return true
  if (!EVENT_SLUG_PATTERN.test(slug)) {
    return 'Lowercase letters, numbers and hyphens only (no "/" or ".")'
  }
  return RESERVED_SLUGS.includes(slug)
    ? `“${slug}” is used by the calendar feed. Choose another address`
    : true
}

/** The end must come after the start (whole days: the last day can't be before the first). */
export function checkEnd(end: string | undefined, document: unknown): true | string {
  const { start, allDay, timeZone } = (document ?? {}) as EventDraft
  if (!end || !start) return true
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return true
  if (allDay) {
    const zone = resolveTiming({ start, timeZone })?.timeZone ?? DEFAULT_EVENT_TIME_ZONE
    const first = parseDateKey(localDateKey(startMs, zone))
    const last = parseDateKey(localDateKey(endMs, zone))
    return first && last && daysBetween(first, last) < 0
      ? 'The last day must not be before the first day'
      : true
  }
  return endMs > startMs ? true : 'The end must be after the start'
}

/** A timed event needs a time zone; an all-day one falls back to the business's. */
export function checkTimeZone(zone: string | undefined, document: unknown): true | string {
  return !zone && (document as EventDraft | undefined)?.allDay !== true
    ? 'Choose the time zone: a timed event needs one'
    : true
}

/** A series can't end before it begins. */
export function checkUntil(until: string | undefined, document: unknown): true | string {
  const { start, timeZone } = (document ?? {}) as EventDraft
  const timing = start ? resolveTiming({ start, timeZone }) : null
  if (!until || !timing) return true
  const first = parseDateKey(localDateKey(timing.start, timing.timeZone))
  const last = parseDateKey(until)
  return first && last && daysBetween(first, last) < 0
    ? 'This is before the first date, so it would never happen'
    : true
}

const isRepeating = (document: unknown) => {
  const repeat = (document as EventDraft | undefined)?.recurrence?.repeat
  return !!repeat && repeat !== 'none'
}

/**
 * The time zone a new event starts with: the one in Business info, so an agency sets it once per
 * client. An unreachable dataset or no Business info falls back to Sydney.
 */
async function businessTimeZone(
  _params: unknown,
  { getClient }: { getClient: (options: { apiVersion: string }) => unknown },
) {
  try {
    const client = getClient({ apiVersion: '2025-01-01' }) as {
      fetch: <T>(query: string) => Promise<T>
    }
    const zone = await client.fetch<string | null>(`*[_id == "businessInfo"][0].timeZone`)
    return zone || DEFAULT_EVENT_TIME_ZONE
  } catch {
    return DEFAULT_EVENT_TIME_ZONE
  }
}

/** The Studio list subtitle: "Sat 14 Mar, 10:00 am · Workshop", plus the status when it isn't "Scheduled". */
export function eventPreview({
  title,
  start,
  allDay,
  timeZone,
  category,
  status,
}: {
  title?: string
  start?: string
  allDay?: boolean
  timeZone?: string
  category?: string
  status?: string
}) {
  const timing = start ? resolveTiming({ start, allDay, timeZone }) : null
  const statusTitle =
    status && status !== 'scheduled'
      ? EVENT_STATUSES.find(({ value }) => value === status)?.title
      : undefined
  const when = timing ? formatEventSubtitle(timing, category) : category
  return {
    title: title || 'Untitled event',
    subtitle: [when || 'No date yet', statusTitle].filter(Boolean).join(' · '),
  }
}

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  icon: CalendarIcon,
  fieldsets: [
    { name: 'when', title: 'When' },
    { name: 'where', title: 'Where' },
    {
      name: 'recurrence',
      title: 'Repeats',
      description: 'For an event that happens again and again, like a weekly class.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.title, 'Event titles')],
    }),
    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      description: 'The event’s page is at /events/<address>.',
      options: { source: 'title', slugify: slugifyEvent },
      validation: (rule) =>
        rule
          .required()
          .custom((slug) =>
            !slug?.current || EVENT_SLUG_PATTERN.test(slug.current)
              ? true
              : 'Lowercase letters, numbers and hyphens only (no "/" or ".")',
          ),
    }),
    defineField({
      name: 'start',
      type: 'datetime',
      fieldset: 'when',
      description: 'When it begins. For an all-day event, pick any time on the first day.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'end',
      type: 'datetime',
      fieldset: 'when',
      description: 'Optional. When it finishes. For an all-day event, any time on the last day.',
      validation: (rule) => rule.custom((end, { document }) => checkEnd(end, document)),
    }),
    defineField({
      name: 'allDay',
      title: 'All day',
      type: 'boolean',
      fieldset: 'when',
      initialValue: false,
      description: 'Shows dates only, with no times.',
    }),
    defineField({
      name: 'timeZone',
      title: 'Time zone',
      type: 'string',
      fieldset: 'when',
      description:
        'Where the event happens. Starts as your business’s time zone. Times show in this zone for everyone, and calendar files use it.',
      initialValue: businessTimeZone,
      options: {
        list: TIME_ZONES.map(({ value, title }) => ({ value, title })),
        layout: 'dropdown',
      },
      validation: (rule) => rule.custom((zone, { document }) => checkTimeZone(zone, document)),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: `One or two sentences, shown on the cards and in search results. ${LIMITS.summary} characters or fewer reads best.`,
      validation: (rule) => lengthWarning(rule, LIMITS.summary, 'Summaries'),
    }),
    // Named `body` like posts and sections: a rich-text field called `description` would change the type
    // of every query that reads the site description from documents chosen by `_id` alone.
    defineField({
      name: 'body',
      title: 'Description',
      type: 'blockContent',
      description: 'The full details, shown on the event’s page.',
    }),
    imageField({
      name: 'image',
      aspect: '16:9',
      minWidth: 1200,
      description: 'Shown on the event’s page and the featured card. Alt text is required.',
    }),
    defineField({
      name: 'location',
      type: 'object',
      fieldset: 'where',
      options: { columns: 1 },
      initialValue: { kind: 'venue' },
      fields: [
        defineField({
          name: 'kind',
          title: 'Where is it?',
          type: 'string',
          initialValue: 'venue',
          options: {
            layout: 'radio',
            direction: 'horizontal',
            list: [
              { value: 'venue', title: 'At a venue' },
              { value: 'online', title: 'Online' },
            ],
          },
        }),
        defineField({
          name: 'name',
          title: 'Venue name',
          type: 'string',
          description: 'e.g. “The Studio”.',
          hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind === 'online',
        }),
        defineField({
          name: 'address',
          type: 'text',
          rows: 2,
          description: 'Street address. Optional.',
          hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind === 'online',
        }),
        defineField({
          name: 'url',
          title: 'Link to join',
          type: 'url',
          description: 'The meeting or livestream link. Shown on the event’s page.',
          hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind !== 'online',
          validation: (rule) =>
            rule
              .uri({ scheme: ['https'] })
              .custom((url, { parent }) =>
                (parent as { kind?: string } | undefined)?.kind === 'online' && !url
                  ? 'Add the link people use to join'
                  : true,
              ),
        }),
      ],
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{ type: 'eventCategory' }],
      description: 'Optional. Lets an Events section show only one kind of event.',
    }),
    defineField({
      name: 'registration',
      title: 'Registration button',
      type: 'cta',
      description:
        'Optional. “Register”, “Buy tickets”, “Book a place”: a link to a page or another site, or a booking.',
    }),
    defineField({
      name: 'status',
      type: 'string',
      initialValue: 'scheduled',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: EVENT_STATUSES.map(({ value, title }) => ({ value, title })),
      },
      description:
        'Cancelled and sold-out events stay on the site with a label, and the registration button goes.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'capacityNote',
      title: 'Places note',
      type: 'string',
      description: 'Optional. e.g. “Limited to 12 people”. Text only: it doesn’t count bookings.',
    }),
    defineField({
      name: 'recurrence',
      title: 'Repeats',
      type: 'object',
      fieldset: 'recurrence',
      options: { columns: 1 },
      initialValue: { repeat: 'none' },
      fields: [
        defineField({
          name: 'repeat',
          type: 'string',
          initialValue: 'none',
          options: {
            layout: 'radio',
            list: [
              { value: 'none', title: 'Does not repeat' },
              { value: 'weekly', title: 'Every week, on the same day' },
              { value: 'fortnightly', title: 'Every fortnight, on the same day' },
              {
                value: 'monthly',
                title: 'Every month, on the same weekday (e.g. the second Tuesday)',
              },
            ],
          },
        }),
        defineField({
          name: 'until',
          title: 'Last date',
          type: 'date',
          description:
            'The last day it can happen. Leave empty to keep it going; set one so the series ends.',
          hidden: ({ document }) => !isRepeating(document),
          validation: (rule) => rule.custom((until, { document }) => checkUntil(until, document)),
        }),
        defineField({
          name: 'skip',
          title: 'Days it doesn’t happen',
          type: 'array',
          of: [defineArrayMember({ type: 'date' })],
          options: { layout: 'tags' },
          description: 'Public holidays, school breaks. Add each day the event is not on.',
          hidden: ({ document }) => !isRepeating(document),
        }),
      ],
    }),
  ],
  orderings: [
    {
      name: 'upcoming',
      title: 'Date, soonest first',
      by: [{ field: 'start', direction: 'asc' }],
    },
    {
      name: 'latest',
      title: 'Date, latest first',
      by: [{ field: 'start', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      start: 'start',
      allDay: 'allDay',
      timeZone: 'timeZone',
      category: 'category.title',
      status: 'status',
      media: 'image',
    },
    prepare: ({ media, ...values }: Parameters<typeof eventPreview>[0] & { media?: unknown }) => ({
      ...eventPreview(values),
      media: media as never,
    }),
  },
})
