import { BellIcon } from '@sanity/icons/Bell'
import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

/** The fields below the message only matter once there is a message to show. */
const hiddenWithoutMessage: ConditionalPropertyCallback = ({ document }) => !document?.message

/** A singleton: the one document has `_id === 'announcement'` (see SINGLETON_TYPES and the desk structure). */
export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement bar',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'message',
      type: 'string',
      description:
        'A one-line banner above the header. Up to 120 characters; leave it empty to show nothing. If you add a link, the whole message is the link.',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'link',
      type: 'link',
      description: 'Optional: where the message leads.',
      hidden: hiddenWithoutMessage,
    }),
    defineField({
      name: 'startsAt',
      title: 'Show from',
      type: 'datetime',
      description: 'Optional. Empty means it is already showing.',
      hidden: hiddenWithoutMessage,
    }),
    defineField({
      name: 'endsAt',
      title: 'Show until',
      type: 'datetime',
      description: 'Optional. The bar disappears after this time; empty means no end.',
      hidden: hiddenWithoutMessage,
      validation: (rule) =>
        rule.custom((value, { parent }) => {
          const startsAt = (parent as { startsAt?: string } | undefined)?.startsAt
          return value && startsAt && value <= startsAt
            ? '"Show until" must be after "Show from"'
            : true
        }),
    }),
    defineField({
      name: 'dismissible',
      title: 'Visitors can dismiss it',
      type: 'boolean',
      description:
        'Adds a close button. It stays closed in that browser until the message changes.',
      initialValue: false,
      hidden: hiddenWithoutMessage,
    }),
  ],
  preview: {
    select: { message: 'message' },
    prepare: ({ message }: { message?: string }) => ({
      title: 'Announcement bar',
      subtitle: message || 'Nothing showing',
    }),
  },
})
