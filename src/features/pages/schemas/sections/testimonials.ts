import { CommentIcon } from '@sanity/icons/Comment'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { avatarDesignField } from '@/lib/sanity/schema/avatar-design'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageField } from '@/lib/sanity/schema/image-field'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  TESTIMONIAL_CARD_PRESETS,
  TESTIMONIAL_ROLE_COLOURS,
} from '@/lib/sanity/schema/testimonial-card-presets'
import {
  TestimonialsGridThumbnail,
  TestimonialsSliderThumbnail,
} from '@/lib/sanity/schema/thumbnails/testimonials-thumbnails'
import { permissionWarning, sourceDateWarning, TESTIMONIAL_SOURCES } from '@/lib/testimonial-source'
import { missingHighlights } from '@/lib/text-highlights'

import { cardDesignField, eyebrowField, headerDesignField } from '../card-design-fields'
import { testimonialsCapabilities } from './testimonials-capabilities'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
  eyebrow: 40,
} as const

/** A quote's fields read from its neighbours, for the warnings below. */
interface StoredTestimonial {
  quote?: string
  source?: string
  date?: string
  rating?: number
}
const testimonialOf = (context: { parent?: unknown }) => (context.parent ?? {}) as StoredTestimonial

/**
 * One component per variant in components/sections/testimonials/. The first is the default: what
 * content without a variant renders. At most four per section.
 */
export const TESTIMONIALS_VARIANTS = [
  {
    value: 'grid',
    title: 'Grid',
    description: 'Every quote in a card, side by side.',
    thumbnail: TestimonialsGridThumbnail,
  },
  {
    value: 'slider',
    title: 'Slider',
    description: 'One to three quotes at a time, swiped, dragged or stepped through.',
    thumbnail: TestimonialsSliderThumbnail,
  },
] as const

export const testimonials = defineType({
  name: 'testimonials',
  title: 'Testimonials',
  type: 'object',
  icon: CommentIcon,
  options: { designCapabilities: testimonialsCapabilities },
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      eyebrowField(LIMITS.eyebrow),
      headingField({
        name: 'heading',
        title: 'Section title',
        description: 'Select words to make them stand out.',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'intro',
        title: 'Intro',
        type: 'text',
        rows: 2,
        description: 'A sentence or two under the title. Optional.',
      }),
      defineField({
        name: 'items',
        title: 'Testimonials',
        type: 'array',
        validation: (rule) => rule.required().min(1),
        of: [
          defineArrayMember({
            name: 'testimonial',
            type: 'object',
            fields: [
              defineField({
                name: 'quote',
                type: 'text',
                rows: 4,
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: 'highlights',
                title: 'Highlighted words',
                type: 'array',
                of: [defineArrayMember({ type: 'string' })],
                options: { layout: 'tags' },
                description:
                  'Words to stand out, copied exactly from the quote. The quote itself stays as written.',
                validation: (rule) =>
                  rule
                    .custom((phrases: string[] | undefined, context) => {
                      const missing = missingHighlights(testimonialOf(context).quote, phrases)
                      return missing.length === 0
                        ? true
                        : `Not found in the quote, so not highlighted: ${missing.join(', ')}. Copy the words exactly, on one line.`
                    })
                    .warning(),
              }),
              defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
              defineField({ name: 'role', type: 'string', description: 'e.g. "CEO, Acme"' }),
              defineField({
                name: 'attribution',
                title: 'Attribution line',
                type: 'string',
                description: 'An extra line under the name, e.g. "Client since 2019". Optional.',
              }),
              imageField({ name: 'avatar', requireAlt: false, aspect: '1:1', minWidth: 800 }),
              defineField({
                name: 'source',
                title: 'Where it came from',
                type: 'string',
                description: 'Shown as plain words on the card. Other is kept here but not shown.',
                options: {
                  list: [...TESTIMONIAL_SOURCES],
                  layout: 'radio',
                  direction: 'horizontal',
                },
              }),
              defineField({
                name: 'date',
                title: 'Date',
                type: 'date',
                description: 'When the client wrote it. Shown on the card.',
                validation: (rule) =>
                  rule
                    .custom((date: string | undefined, context) =>
                      sourceDateWarning(testimonialOf(context).source, date),
                    )
                    .warning(),
              }),
              defineField({
                name: 'rating',
                title: 'Rating',
                type: 'number',
                description:
                  'Only if the place it came from had a rating. Shown as stars, for this quote alone.',
                options: { list: [1, 2, 3, 4, 5], layout: 'radio', direction: 'horizontal' },
                validation: (rule) => rule.integer().min(1).max(5),
              }),
              defineField({
                name: 'permissionToPublish',
                title: 'Permission to publish',
                type: 'boolean',
                description:
                  'The person agreed to their words and name being shown here. Never shown on the site.',
                validation: (rule) =>
                  rule
                    .custom((confirmed: boolean | undefined) => permissionWarning(confirmed))
                    .warning(),
              }),
            ],
            preview: { select: { title: 'name', subtitle: 'quote', media: 'avatar' } },
          }),
        ],
      }),
      headerDesignField(),
      cardDesignField({
        description:
          'Shared background, border, text and mark for every quote. Inherit uses the default card.',
        presets: TESTIMONIAL_CARD_PRESETS,
        roles: [{ role: 'quote', highlight: true }, { role: 'attribution' }, { role: 'label' }],
        inherits: 'the default card',
        defaults: TESTIMONIAL_ROLE_COLOURS,
      }),
      avatarDesignField({
        name: 'avatarDesign',
        title: 'Avatar',
        description: 'Size and ring for the author’s picture. Medium with no ring is the default.',
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(TESTIMONIALS_VARIANTS),
    ],
    { tone: 'alt', align: 'center' },
  ),
  preview: {
    select: { heading: 'heading', title: 'title', variant: 'variant', tone: 'style.tone' },
    prepare: ({
      heading,
      title,
      variant,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      variant?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Testimonials',
      subtitle: variantSubtitle('Testimonials', TESTIMONIALS_VARIANTS, variant, tone),
    }),
  },
})
