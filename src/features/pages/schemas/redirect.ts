import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { defineField, defineType } from 'sanity'

const PATH = /^\/[^\s?#]*$/
const URL_OR_PATH = /^(\/[^\s]*|https?:\/\/[^\s]+)$/

/**
 * Old URL -> new URL. Applied only to paths that don't match a page, so a redirect can never
 * hide a live page. Typical use: keeping old links working after replacing a site.
 */
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: ArrowRightIcon,
  fields: [
    defineField({
      name: 'source',
      title: 'From',
      type: 'string',
      description:
        'Old path, e.g. "/about-us.html". Matched without regard to case or a trailing slash.',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            !value || PATH.test(value) ? true : 'Start with "/"; no spaces, "?" or "#"',
          )
          .custom(async (value, { document, getClient }) => {
            if (!value) return true
            const id = document?._id.replace(/^drafts\./, '') ?? ''
            const duplicates = await getClient({ apiVersion: '2026-10-01' }).fetch<number>(
              'count(*[_type == "redirect" && lower(source) == lower($source) && !(_id in [$id, "drafts." + $id])])',
              { source: value, id },
            )
            return duplicates === 0 ? true : 'Another redirect already uses this path'
          }),
    }),
    defineField({
      name: 'destination',
      title: 'To',
      type: 'string',
      description: 'New path ("/about") or full URL ("https://…").',
      validation: (rule) =>
        rule.required().custom((value, { document }) => {
          if (!value) return true
          if (!URL_OR_PATH.test(value)) return 'Use a path starting with "/" or a full https:// URL'
          const source = (document as { source?: string } | undefined)?.source
          return value === source ? 'Destination must differ from the source' : true
        }),
    }),
    defineField({
      name: 'permanent',
      type: 'boolean',
      initialValue: true,
      description: 'On: permanent (308), passes SEO value to the new URL. Off: temporary (307).',
    }),
  ],
  preview: {
    select: { source: 'source', destination: 'destination', permanent: 'permanent' },
    prepare: ({
      source,
      destination,
      permanent,
    }: {
      source?: string
      destination?: string
      permanent?: boolean
    }) => ({
      title: source ?? 'No source',
      subtitle: `→ ${destination ?? '?'}${permanent === false ? ' (temporary)' : ''}`,
    }),
  },
})
