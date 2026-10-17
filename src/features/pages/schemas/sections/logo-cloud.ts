import { ImagesIcon } from '@sanity/icons/Images'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageField } from '@/lib/sanity/schema/image-field'
import { presetField } from '@/lib/sanity/schema/preset-field'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  LogoCloudGridThumbnail,
  LogoCloudMarqueeThumbnail,
} from '@/lib/sanity/schema/thumbnails/logo-cloud-thumbnails'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // A single line of small text above the logos.
  title: 60,
} as const

/**
 * One component per variant in components/sections/logo-cloud/. The first is the default: the wrapped
 * grid, and what content without a variant renders. At most four per section.
 */
export const LOGO_CLOUD_VARIANTS = [
  {
    value: 'grid',
    title: 'Grid',
    description: 'The logos in a wrapped row, still.',
    thumbnail: LogoCloudGridThumbnail,
  },
  {
    value: 'marquee',
    title: 'Marquee',
    description: 'One endless row that scrolls by itself, with a Pause button.',
    thumbnail: LogoCloudMarqueeThumbnail,
  },
] as const

/** The marquee's logo colour; unset is greyscale, as in the grid. */
const LOGO_COLOUR_OPTIONS = [
  { value: 'grey', title: 'Greyscale', description: 'Muted logos that turn to colour on hover.' },
  { value: 'colour', title: 'Full colour', description: 'Logos always in their own colours.' },
] as const

const notMarquee = ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'marquee'

export const logoCloud = defineType({
  name: 'logoCloud',
  title: 'Logo strip',
  type: 'object',
  icon: ImagesIcon,
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Title',
        description: 'e.g. "Trusted by teams at"',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'logos',
        type: 'array',
        validation: (rule) => rule.required().min(1),
        of: [
          defineArrayMember({
            name: 'logo',
            type: 'object',
            fields: [
              defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
              imageField({
                name: 'image',
                requireAlt: false,
                description: 'SVG or transparent PNG.',
                preferSvg: true,
                minWidth: 400,
                validation: (rule) => rule.required(),
              }),
              defineField({ name: 'url', title: 'Link', type: 'url' }),
            ],
            preview: { select: { title: 'name', media: 'image' } },
          }),
        ],
      }),
      accessField,
      // Shown first in the Content tab.
      variantField(LOGO_CLOUD_VARIANTS),
    ],
    { spacing: 'compact', align: 'center', motion: 'none' },
    {
      // The marquee's own option, in the collapsed Advanced area of the Design tab: it disappears for the grid.
      advanced: [
        presetField({
          name: 'logoColour',
          title: 'Logo colour',
          options: LOGO_COLOUR_OPTIONS,
          required: false,
          hidden: notMarquee,
        }),
      ],
    },
  ),
  preview: {
    select: {
      heading: 'heading',
      title: 'title',
      logos: 'logos',
      variant: 'variant',
      tone: 'style.tone',
    },
    prepare: ({
      heading,
      title,
      logos,
      variant,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      logos?: unknown[]
      variant?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || 'Logo strip',
      subtitle: `${variantSubtitle('Logo strip', LOGO_CLOUD_VARIANTS, variant, tone)} · ${logos?.length ?? 0} logos`,
    }),
  },
})
