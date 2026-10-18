import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineField, defineType } from 'sanity'

import { DEFAULT_LAUNCH_LABEL, formatLaunchLine, isLaunchPast } from '@/lib/launch-date'
import { DEFAULT_TIME_ZONE, isTime } from '@/lib/opening-hours'

import { lengthWarning } from './length-guidance'

/** Longest text the design handles. Longer text still publishes, with a warning. */
export const LAUNCH_DATE_LIMITS = {
  // "Opening Wednesday 30 September, 9:30 am" in text-body: one line on a phone with a short label.
  label: 20,
} as const

/**
 * One line saying when the business opens ("Opening Monday 3 November"), for the hero's supporting
 * slot on a pre-launch page. The date is in the Business info time zone; after it the line is gone.
 * The live countdown and the time of day are in the collapsed Advanced area, off until wanted. It
 * takes the tone of whatever it sits in.
 */
export const launchDate = defineType({
  name: 'launchDate',
  title: 'Launch date',
  type: 'object',
  icon: CalendarIcon,
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      description: 'A time of day and a live countdown. Both are optional.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      initialValue: DEFAULT_LAUNCH_LABEL,
      description: `The word before the date, e.g. “${DEFAULT_LAUNCH_LABEL}”, “Doors open” or “Launching”.`,
      validation: (rule) => lengthWarning(rule, LAUNCH_DATE_LIMITS.label, 'Labels'),
    }),
    defineField({
      name: 'date',
      type: 'date',
      description:
        'The day, in the time zone set in Business info. The line disappears at the end of this day (or at the time below).',
      options: { dateFormat: 'D MMMM YYYY' },
      validation: (rule) => [
        rule.required(),
        rule
          .custom((date, { parent }) => {
            const launch = parent as { time?: string } | undefined
            return date &&
              isLaunchPast({ date, time: launch?.time, timeZone: DEFAULT_TIME_ZONE }, Date.now())
              ? 'This date has passed, so the line will not show. Choose a later date, or remove it.'
              : true
          })
          .warning(),
      ],
    }),
    defineField({
      name: 'time',
      title: 'Time of day',
      type: 'string',
      fieldset: 'advanced',
      description:
        'Optional, in 24-hour time like 09:00 or 17:30. Adds the time to the line, and the countdown counts to it. Leave empty for the whole day.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || isTime(value) ? true : 'Use 24-hour time like 09:00 or 17:30',
        ),
    }),
    defineField({
      name: 'countdown',
      title: 'Live countdown',
      type: 'boolean',
      fieldset: 'advanced',
      initialValue: false,
      description:
        'Counts down under the date, to the minute (to the second in the last hour). Visitors who prefer less motion, and screen readers, get the date line only. Loads a little extra code on this page only.',
    }),
  ],
  preview: {
    select: { label: 'label', date: 'date', time: 'time', countdown: 'countdown' },
    prepare: ({
      label,
      date,
      time,
      countdown,
    }: {
      label?: string
      date?: string
      time?: string
      countdown?: boolean
    }) => ({
      title: 'Launch date',
      subtitle: [formatLaunchLine({ date, time }, label) ?? 'No date yet', countdown && 'Countdown']
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
