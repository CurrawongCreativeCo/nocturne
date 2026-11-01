import { PinIcon } from '@sanity/icons/Pin'
import {
  defineField,
  defineType,
  type ConditionalPropertyCallback,
  type PreviewValue,
} from 'sanity'

import { parseAuPhone } from '@/lib/au-phone'
import { DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import {
  addressField,
  geoField,
  openingHoursField,
  specialHoursField,
  timeZoneField,
} from '@/lib/sanity/schema/business-fields'
import { imageField } from '@/lib/sanity/schema/image-field'

import { LOCATION_SLUG_PATTERN, slugifyLocation } from '../utils/slug'

/** Longest summary: it is the page's meta description and the search snippet. */
export const LOCATION_SUMMARY_MAX = 160

export const LOCATION_KINDS = [
  { value: 'branch', title: 'Branch (people can visit)' },
  { value: 'serviceArea', title: 'Service area (somewhere you travel to)' },
] as const

type Kind = (typeof LOCATION_KINDS)[number]['value']

/** A service area has no address, phone or hours: those fields only show for a branch. */
export const hiddenForServiceArea: ConditionalPropertyCallback = ({ document }) =>
  (document as { kind?: Kind } | undefined)?.kind === 'serviceArea'

/**
 * What a branch must have and a service area must not be asked for. Hidden fields skip validation
 * in Studio, but a document switched from branch to area keeps its values, so every requirement is
 * tied to the kind as well.
 */
export function branchRequires(kind: Kind | undefined, missing: boolean, message: string) {
  return kind === 'branch' && missing ? message : true
}

/**
 * A branch or a service area. Business info stays the primary place; a business with one site makes
 * no location documents. A location is an additional place: its own page, address and hours for a
 * branch, and a named area for somewhere you travel to.
 */
export const location = defineType({
  // Not `location`: the page builder's Location section already has that type name.
  name: 'place',
  title: 'Location',
  type: 'document',
  icon: PinIcon,
  fieldsets: [
    { name: 'contact', title: 'Contact', hidden: hiddenForServiceArea },
    { name: 'address', title: 'Address and hours', hidden: hiddenForServiceArea },
  ],
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'kind',
      title: 'What is it?',
      type: 'string',
      initialValue: 'branch',
      description:
        'A branch is a place people can visit, with an address and opening hours. A service area is a region you travel to.',
      options: {
        list: LOCATION_KINDS.map(({ value, title }) => ({ value, title })),
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Page address',
      type: 'slug',
      description: 'The location’s page is at /locations/<address>.',
      options: { source: 'name', slugify: slugifyLocation },
      validation: (rule) =>
        rule
          .required()
          .custom((slug) =>
            !slug?.current || LOCATION_SLUG_PATTERN.test(slug.current)
              ? true
              : 'Lowercase letters, numbers and hyphens only (no "/")',
          ),
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: `One or two sentences on this place or area. Shown under the heading and used as the page’s description. ${LOCATION_SUMMARY_MAX} characters at most.`,
      validation: (rule) => [
        rule
          .max(LOCATION_SUMMARY_MAX)
          .error(`Keep the summary to ${LOCATION_SUMMARY_MAX} characters or fewer`),
        rule
          .custom((value) => (value ? true : 'A short summary helps visitors and search results'))
          .warning(),
      ],
    }),
    imageField({
      name: 'image',
      aspect: '16:9',
      minWidth: 1200,
      description: 'Optional. A photo of the branch or the area. Alt text is required.',
    }),
    defineField({
      name: 'body',
      title: 'About this place',
      type: 'blockContent',
      description:
        'Optional. How to get there, parking, the suburbs you cover, local projects: what a visitor to this page wants to know.',
    }),
    defineField({
      name: 'phone',
      type: 'string',
      fieldset: 'contact',
      hidden: hiddenForServiceArea,
      description: 'Australian number, for example (02) 9876 5432. Leave empty to show none.',
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
      hidden: hiddenForServiceArea,
      description: 'Optional. Shown on this location’s page.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email address',
        ),
    }),
    addressField({
      fieldset: 'address',
      hidden: hiddenForServiceArea,
      description:
        'Where customers visit. Leave the street empty if they should not turn up (the suburb, state and postcode are still published).',
      validation: (rule) =>
        rule.custom((value, { document }) =>
          branchRequires(
            (document as { kind?: Kind } | undefined)?.kind,
            !(value as { suburb?: string } | undefined)?.suburb,
            'A branch needs at least a suburb, state and postcode',
          ),
        ),
    }),
    timeZoneField({
      fieldset: 'address',
      hidden: hiddenForServiceArea,
      description:
        'Where this branch trades. It decides when the “Open now” badge says it is open.',
      // Only a branch needs one; a service area hides the field, so it can't be required of the document.
      validation: (rule) =>
        rule.custom((value, { document }) =>
          branchRequires(
            (document as { kind?: Kind } | undefined)?.kind,
            !value,
            'Choose the time zone',
          ),
        ),
    }),
    openingHoursField({ fieldset: 'address', hidden: hiddenForServiceArea }),
    specialHoursField({ fieldset: 'address', hidden: hiddenForServiceArea }),
    geoField({ hidden: hiddenForServiceArea }),
  ],
  preview: {
    select: { title: 'name', kind: 'kind', suburb: 'address.suburb', media: 'image' },
    prepare: ({
      title,
      kind,
      suburb,
      media,
    }: {
      title?: string
      kind?: Kind
      suburb?: string
      media?: PreviewValue['media']
    }) => ({
      title: title || 'Untitled location',
      subtitle:
        kind === 'serviceArea' ? 'Service area' : ['Branch', suburb].filter(Boolean).join(' · '),
      media,
    }),
  },
  initialValue: { kind: 'branch', timeZone: DEFAULT_TIME_ZONE },
})
