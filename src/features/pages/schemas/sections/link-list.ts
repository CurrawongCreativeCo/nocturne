import { BlockElementIcon } from '@sanity/icons/BlockElement'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ConditionalPropertyCallback,
} from 'sanity'

import {
  GLASS_STRENGTHS,
  GLASS_STRENGTH_TITLES,
  glassContrastProblem,
} from '@/lib/color/glass-contrast'
import { BADGE_ICONS } from '@/lib/sanity/badge-icons'
import { headingPlainText } from '@/lib/sanity/heading-text'
import { accessField } from '@/lib/sanity/schema/access-field'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageField } from '@/lib/sanity/schema/image-field'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { presetField, presetsOption } from '@/lib/sanity/schema/preset-field'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, variantField, variantSubtitle } from '@/lib/sanity/schema/section-variant'
import {
  LinkListCardsThumbnail,
  LinkListCompactThumbnail,
  LinkListEditorialThumbnail,
  LinkListGlassThumbnail,
  LinkListImageThumbnail,
  LinkListMinimalThumbnail,
} from '@/lib/sanity/schema/thumbnails/link-list-thumbnails'
import { SOCIAL_PLATFORMS, socialPlatformTitle } from '@/lib/social-platforms'

import { LINK_LIST_RECOMMENDED_MAX, PROFILE_BIO_MAX } from '../../utils/link-list'
import { enclosingOfArray } from '../../utils/schema-path'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
  // One line of a button on a phone (about 40), and a two-line description under it.
  label: 40,
  description: 90,
  name: 50,
} as const

/**
 * One component per variant in components/sections/link-list/. The first is the default: what
 * content without a variant renders. The picture-led layout is a preset of Cards, and Glass rows a
 * preset of Minimal (see LINK_LIST_PRESETS), not a fifth and sixth variant: a section has at most four.
 */
export const LINK_LIST_VARIANTS = [
  {
    value: 'stacked',
    title: 'Minimal',
    description: 'Full-width buttons, one under the other.',
    thumbnail: LinkListMinimalThumbnail,
  },
  {
    value: 'cards',
    title: 'Cards',
    description: 'Thumbnails in cards, two across from tablet width.',
    thumbnail: LinkListCardsThumbnail,
  },
  {
    value: 'editorial',
    title: 'Editorial',
    description: 'Larger type, links as a list with arrows.',
    thumbnail: LinkListEditorialThumbnail,
  },
  {
    value: 'compact',
    title: 'Compact',
    description: 'Small pills, for tucking into another page.',
    thumbnail: LinkListCompactThumbnail,
  },
] as const

/** How big Cards draw their pictures: the second is what the Image-focused preset sets. */
export const LINK_LIST_THUMBNAIL_SIZES = ['standard', 'large'] as const

/** How Minimal draws its rows: the plain buttons, or frosted glass (the Glass rows preset). */
export const LINK_LIST_ROW_STYLES = ['solid', 'glass'] as const

/**
 * The picker at the top of the Content tab: six pictures, four layouts. Image-focused is Cards with
 * large pictures leading each card; Glass rows is Minimal with `rowStyle: 'glass'`. Every preset sets
 * the layout, the row style and the alignment that goes with them, and leaves the content and the tone
 * alone, so trying one loses nothing. The first is a new section's look.
 */
export const LINK_LIST_PRESETS = [
  {
    value: 'minimal',
    title: 'Minimal',
    description: 'Full-width buttons, one under the other.',
    thumbnail: LinkListMinimalThumbnail,
    set: {
      variant: 'stacked',
      rowStyle: 'solid',
      thumbnailSize: 'standard',
      'style.align': 'center',
    },
  },
  {
    value: 'cards',
    title: 'Cards',
    description: 'Thumbnails in cards, two across from tablet width.',
    thumbnail: LinkListCardsThumbnail,
    set: {
      variant: 'cards',
      rowStyle: 'solid',
      thumbnailSize: 'standard',
      'style.align': 'center',
    },
  },
  {
    value: 'editorial',
    title: 'Editorial',
    description: 'Larger type, links as a list with arrows.',
    thumbnail: LinkListEditorialThumbnail,
    set: {
      variant: 'editorial',
      rowStyle: 'solid',
      thumbnailSize: 'standard',
      'style.align': 'start',
    },
  },
  {
    value: 'compact',
    title: 'Compact',
    description: 'Small pills, for tucking into another page.',
    thumbnail: LinkListCompactThumbnail,
    set: {
      variant: 'compact',
      rowStyle: 'solid',
      thumbnailSize: 'standard',
      'style.align': 'start',
    },
  },
  {
    value: 'image-focused',
    title: 'Image-focused',
    description: 'Big pictures lead each card. Add a thumbnail to every link.',
    thumbnail: LinkListImageThumbnail,
    set: {
      variant: 'cards',
      rowStyle: 'solid',
      thumbnailSize: 'large',
      'style.align': 'center',
    },
  },
  {
    value: 'glass-rows',
    title: 'Glass rows',
    description: 'Frosted-glass rows to sit over a full-page photo. Add a thumbnail and an icon.',
    thumbnail: LinkListGlassThumbnail,
    set: {
      variant: 'stacked',
      rowStyle: 'glass',
      thumbnailSize: 'standard',
      'style.align': 'center',
    },
  },
] as const

/** The layout and row style of the section a link sits in; unset ones are the defaults (Minimal, solid). */
const looksOfLink = ({ document, path }: Parameters<ConditionalPropertyCallback>[0]) => {
  const section = enclosingOfArray(document, path, 'links')
  return {
    layout: typeof section?.variant === 'string' ? section.variant : LINK_LIST_VARIANTS[0].value,
    rowStyle: typeof section?.rowStyle === 'string' ? section.rowStyle : 'solid',
  }
}

/** Glass rows are Minimal with the glass row style; no other layout has one. */
export const isGlassRows = (layout: string, rowStyle = 'solid') =>
  layout === 'stacked' && rowStyle === 'glass'

/**
 * What each layout draws for a link, so the form only asks for what shows. Glass rows draw the icon
 * and the thumbnail together; every other layout draws one or the other (a thumbnail replaces the icon).
 */
export const usesIcon = (layout: string, rowStyle = 'solid') =>
  isGlassRows(layout, rowStyle) || layout !== 'editorial'
export const usesThumbnail = (layout: string, rowStyle = 'solid') =>
  isGlassRows(layout, rowStyle) || layout === 'stacked' || layout === 'cards'
export const usesDescription = (layout: string) => layout !== 'compact'
export const usesFeatured = (layout: string) => layout !== 'compact'

const hiddenUnlessLayout =
  (uses: (layout: string, rowStyle: string) => boolean): ConditionalPropertyCallback =>
  (context) => {
    const { layout, rowStyle } = looksOfLink(context)
    return !uses(layout, rowStyle)
  }

const GLASS_STRENGTH_HELP = {
  light: 'More of the photo shows through. Best over a calm, even photo.',
  medium: 'A balance of photo and readability.',
  strong: 'Easiest to read. The photo shows through least.',
} as const

/** The glass options belong to Glass rows only. */
const notGlassRows = ({ parent }: { parent?: { variant?: string; rowStyle?: string } }) =>
  !isGlassRows(parent?.variant ?? LINK_LIST_VARIANTS[0].value, parent?.rowStyle)

/** Tracking tags only make sense on a link to another website. */
const notExternal: ConditionalPropertyCallback = ({ parent }) =>
  (parent as { link?: { linkType?: string } } | undefined)?.link?.linkType !== 'external'

const linkItem = defineArrayMember({
  type: 'object',
  name: 'linkItem',
  title: 'Link',
  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      description: 'Pictures, scheduling and tracking tags.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      description: 'What the button says, e.g. “Book a consultation”.',
      validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.label, 'Link labels')],
    }),
    defineField({
      name: 'link',
      title: 'Where it goes',
      type: 'link',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'string',
      description: 'A short line under the label. Optional.',
      hidden: hiddenUnlessLayout(usesDescription),
      validation: (rule) => lengthWarning(rule, LIMITS.description, 'Descriptions'),
    }),
    defineField({
      name: 'icon',
      type: 'string',
      description:
        'A small icon beside the label. Optional. In Glass rows it sits beside the picture; in the other layouts a picture replaces it.',
      options: {
        list: BADGE_ICONS.map(({ value, title }) => ({ value, title })),
        layout: 'dropdown',
      },
      hidden: hiddenUnlessLayout(usesIcon),
    }),
    defineField({
      name: 'featured',
      title: 'Show large',
      description:
        'Makes this the big link at the top of its list. Only one link is shown large: if you tick more than one, the first wins.',
      type: 'boolean',
      initialValue: false,
      hidden: hiddenUnlessLayout(usesFeatured),
    }),
    defineField({
      name: 'group',
      title: 'Heading above it',
      description:
        'Optional. Links under the same heading are grouped, e.g. “Shop” or “Follow along”.',
      type: 'string',
    }),
    defineField({
      name: 'visibility',
      type: 'string',
      initialValue: 'show',
      options: {
        list: [
          { value: 'show', title: 'Show' },
          { value: 'hide', title: 'Hide' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      description: 'Hide a link to take it off the page without deleting it.',
      validation: (rule) => rule.required(),
    }),
    {
      ...imageField({
        name: 'thumbnail',
        description:
          'A picture for this link. Optional. Glass rows show it down the left of the row, beside the icon; Minimal and Cards show it in place of the icon.',
        hidden: hiddenUnlessLayout(usesThumbnail),
        aspect: '4:3',
        minWidth: 600,
      }),
      fieldset: 'advanced',
    },
    defineField({
      name: 'showFrom',
      title: 'Show from',
      description: 'The link appears on this date and time. Leave empty to show it straight away.',
      type: 'datetime',
      fieldset: 'advanced',
    }),
    defineField({
      name: 'showUntil',
      title: 'Show until',
      description: 'The link disappears at this date and time. Leave empty to keep it.',
      type: 'datetime',
      fieldset: 'advanced',
      validation: (rule) =>
        rule.custom((until, { parent }) => {
          const from = (parent as { showFrom?: string } | undefined)?.showFrom
          return until && from && Date.parse(until) <= Date.parse(from)
            ? 'This is before the link appears, so it would never show'
            : true
        }),
    }),
    defineField({
      name: 'utmSource',
      title: 'UTM source',
      description: 'Added to the address as utm_source, e.g. “instagram”.',
      type: 'string',
      fieldset: 'advanced',
      hidden: notExternal,
    }),
    defineField({
      name: 'utmMedium',
      title: 'UTM medium',
      description: 'Added as utm_medium, e.g. “bio”.',
      type: 'string',
      fieldset: 'advanced',
      hidden: notExternal,
    }),
    defineField({
      name: 'utmCampaign',
      title: 'UTM campaign',
      description: 'Added as utm_campaign, e.g. “spring-launch”.',
      type: 'string',
      fieldset: 'advanced',
      hidden: notExternal,
    }),
  ],
  preview: {
    select: {
      title: 'label',
      group: 'group',
      visibility: 'visibility',
      featured: 'featured',
      from: 'showFrom',
      until: 'showUntil',
      media: 'thumbnail',
    },
    prepare: ({
      title,
      group,
      visibility,
      featured,
      from,
      until,
      media,
    }: {
      title?: string
      group?: string
      visibility?: string
      featured?: boolean
      from?: string
      until?: string
      media?: unknown
    }) => ({
      title: title || 'Untitled link',
      subtitle: joinSubtitle(
        visibility === 'hide' && 'Hidden',
        (from || until) && 'Scheduled',
        featured && 'Large',
        group,
      ),
      media: media as never,
    }),
  },
})

export const linkList = defineType({
  name: 'linkList',
  title: 'Link list',
  type: 'object',
  icon: BlockElementIcon,
  // The preset bar above the form: the one place to choose a layout (README, "Link list").
  options: presetsOption(LINK_LIST_PRESETS),
  // Content, plus the agency-only Design tab (the shared `style` field that sectionFields adds).
  groups: sectionGroups,
  fieldsets: sectionFieldsets,
  fields: sectionFields(
    [
      headingField({
        name: 'heading',
        title: 'Heading',
        description: 'Optional. Leave empty when the profile already says who this is.',
        max: LIMITS.title,
        optional: true,
        requiredUnless: 'title',
      }),
      legacyTitleField(LIMITS.title),
      defineField({
        name: 'profile',
        type: 'object',
        description: 'A picture or logo, a name and a short line about you. All optional.',
        options: { collapsible: true, collapsed: false },
        fields: [
          imageField({
            name: 'image',
            title: 'Picture or logo',
            description: 'Shown round, so centre the face or mark.',
            aspect: '1:1',
            minWidth: 400,
          }),
          defineField({
            name: 'name',
            type: 'string',
            validation: (rule) => lengthWarning(rule, LIMITS.name, 'Names'),
          }),
          defineField({
            name: 'bio',
            type: 'text',
            rows: 3,
            description: `A line or two, up to ${PROFILE_BIO_MAX} characters.`,
            validation: (rule) =>
              rule
                .max(PROFILE_BIO_MAX)
                .error(`Keep it to ${PROFILE_BIO_MAX} characters or fewer (it is a short bio).`),
          }),
        ],
      }),
      defineField({
        name: 'socialSource',
        title: 'Social icons',
        type: 'string',
        initialValue: 'business',
        options: {
          layout: 'radio',
          list: [
            { value: 'business', title: 'Use the social profiles in Business info' },
            { value: 'custom', title: 'Choose a different set' },
            { value: 'none', title: 'None' },
          ],
        },
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'socialLinks',
        title: 'Social profiles',
        type: 'array',
        hidden: ({ parent }: { parent?: { socialSource?: string } }) =>
          parent?.socialSource !== 'custom',
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
        name: 'links',
        type: 'array',
        description: 'Drag to reorder. They appear in this order.',
        of: [linkItem],
        validation: (rule) => [
          rule
            .custom((links) => {
              const featured = (
                links as { featured?: boolean; visibility?: string }[] | undefined
              )?.filter((link) => link.featured && link.visibility !== 'hide')
              return featured && featured.length > 1
                ? 'More than one link is set to show large. Only the first is.'
                : true
            })
            .warning(),
          rule
            .max(LINK_LIST_RECOMMENDED_MAX)
            .warning(
              `More than ${LINK_LIST_RECOMMENDED_MAX} links is a lot to read. Fewer, clearer links get more clicks.`,
            ),
        ],
      }),
      presetField({
        name: 'thumbnailSize',
        title: 'Picture size',
        description: 'How large the pictures are in the cards.',
        options: [
          { value: 'standard', title: 'Standard', description: 'A small thumbnail on each card.' },
          { value: 'large', title: 'Large', description: 'A big picture leads each card.' },
        ],
        hidden: ({ parent }: { parent?: { variant?: string } }) => parent?.variant !== 'cards',
      }),
      presetField({
        name: 'glassStrength',
        title: 'Glass strength',
        description:
          'How see-through the rows are. Stronger glass is easier to read over a busy photo.',
        options: GLASS_STRENGTHS.map((value) => ({
          value,
          title: GLASS_STRENGTH_TITLES[value],
          description: GLASS_STRENGTH_HELP[value],
        })),
        initialValue: 'medium',
        hidden: notGlassRows,
        validation: (rule) => [
          rule.required(),
          rule
            .custom((value, { parent }) => {
              const section = parent as { style?: { tone?: string } } | undefined
              return (
                glassContrastProblem({ tone: section?.style?.tone, strength: value })?.message ??
                true
              )
            })
            .warning(),
        ],
      }),
      defineField({
        name: 'showArrows',
        title: 'Arrow on each row',
        description: 'A round arrow at the end of every row.',
        type: 'boolean',
        initialValue: true,
        hidden: notGlassRows,
      }),
      accessField,
      // Set by the presets above the form; the stored value is the layout the section renders. Hidden
      // so there is one picker, not two. A hidden field keeps its value, and the list subtitle shows it.
      { ...variantField(LINK_LIST_VARIANTS), hidden: true },
      // Also set by the presets: Minimal draws solid buttons (what content without it gets) or glass.
      defineField({
        name: 'rowStyle',
        type: 'string',
        initialValue: 'solid',
        options: { list: LINK_LIST_ROW_STYLES.map((value) => ({ value, title: value })) },
        hidden: true,
      }),
    ],
    // How this section starts when added. Keep it equal to DEFAULTS in the components.
    { align: 'center' },
    // No design option depends on the layout: no picture, and each layout accepts any alignment.
  ),
  preview: {
    select: {
      heading: 'heading',
      title: 'title',
      name: 'profile.name',
      variant: 'variant',
      tone: 'style.tone',
    },
    prepare: ({
      heading,
      title,
      name,
      variant,
      tone,
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      name?: string
      variant?: string
      tone?: string
    }) => ({
      title: headingPlainText(heading) || title || name || 'Link list',
      subtitle: variantSubtitle('Link list', LINK_LIST_VARIANTS, variant, tone),
    }),
  },
})
