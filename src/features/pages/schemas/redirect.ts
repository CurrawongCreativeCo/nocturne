import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { defineField, defineType, type ValidationContext } from 'sanity'

import { apiVersion } from '@/config/env'
import { HOME_SLUG } from '@/config/paths'
import { normalizePath } from '@/lib/redirects'

/** A site path: starts with one "/" (not "//", which browsers treat as another domain). */
const PATH = /^\/(?!\/)[^\s?#]*$/
const DESTINATION = /^(\/(?!\/)\S*|https:\/\/\S+)$/

const OTHER_REDIRECTS = '_type == "redirect" && !(_id in [$id, "drafts." + $id])'

function client(context: ValidationContext) {
  return context.getClient({ apiVersion })
}

function documentId(context: ValidationContext) {
  return context.document?._id.replace(/^drafts\./, '') ?? ''
}

/**
 * Old URL -> new URL. By default applied only to paths that don't match a page, so a redirect
 * can't hide a live page; with Edge Config redirects (proxy.ts) it runs first and does.
 * Typical use: keeping old links working after replacing a site.
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
      validation: (rule) => [
        rule
          .required()
          .custom((value) =>
            !value || PATH.test(value) ? true : 'Start with "/"; no spaces, "?" or "#"',
          )
          .custom(async (value, context) => {
            if (!value) return true
            const duplicates = await client(context).fetch<number>(
              `count(*[${OTHER_REDIRECTS} && lower(source) == lower($source)])`,
              { source: value, id: documentId(context) },
            )
            return duplicates === 0 ? true : 'Another redirect already uses this path'
          }),
        rule
          .custom(async (value, context) => {
            if (!value || !PATH.test(value)) return true
            const slug = normalizePath(value).replace(/^\//, '') || HOME_SLUG
            const pages = await client(context).fetch<number>(
              'count(*[_type == "page" && slug.current == $slug])',
              { slug },
            )
            return pages === 0
              ? true
              : 'A page already uses this path. Without Edge Config redirects the page wins; with them this redirect hides it'
          })
          .warning(),
      ],
    }),
    defineField({
      name: 'destination',
      title: 'To',
      type: 'string',
      description: 'New path ("/about") or full URL ("https://…").',
      validation: (rule) => [
        rule.required().custom(async (value, context) => {
          if (!value) return true
          if (!DESTINATION.test(value)) {
            return 'Use a path starting with a single "/" or a full https:// URL'
          }
          const source = (context.document as { source?: string } | undefined)?.source
          if (source && normalizePath(value) === normalizePath(source)) {
            return 'Destination must differ from the source'
          }
          if (!value.startsWith('/') || !source) return true
          // A redirect whose destination redirects straight back would loop forever.
          const next = await client(context).fetch<string | null>(
            `*[${OTHER_REDIRECTS} && lower(source) == lower($destination)][0].destination`,
            { destination: value, id: documentId(context) },
          )
          return next && normalizePath(next) === normalizePath(source)
            ? `Loop: ${value} already redirects back to ${source}`
            : true
        }),
        rule
          .custom(async (value, context) => {
            if (!value?.startsWith('/')) return true
            const next = await client(context).fetch<string | null>(
              `*[${OTHER_REDIRECTS} && lower(source) == lower($destination)][0].destination`,
              { destination: value, id: documentId(context) },
            )
            return next
              ? `${value} redirects again to ${next}. Point this one straight at ${next}.`
              : true
          })
          .warning(),
      ],
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
