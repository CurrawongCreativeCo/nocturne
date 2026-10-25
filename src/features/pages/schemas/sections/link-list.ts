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
import { listsCategories, looksLikeTypedCategories, plainTextParagraphs } from '@/lib/plain-text'
import { SHADOW_LEVELS, SHADOW_TITLES } from '@/lib/sanity/depth-options'
import { headingPlainText } from '@/lib/sanity/heading-text'
import { LINK_ARROWS, LINK_ARROW_TITLES } from '@/lib/sanity/link-arrow-options'
import {
  LINK_DESIGN_GROUP_TITLES,
  countCustomisedLinks,
  customisedLinksText,
  scopedTitle,
  summariseLinkDesign,
} from '@/lib/sanity/link-design-summary'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { accessField } from '@/lib/sanity/schema/access-field'
import { badgeIconField } from '@/lib/sanity/schema/badge-icon-field'
import { fetchBrandColours } from '@/lib/sanity/schema/brand-colours'
import { headingField, legacyTitleField } from '@/lib/sanity/schema/heading-text'
import { imageField, imageOptions } from '@/lib/sanity/schema/image-field'
import { framing } from '@/lib/sanity/schema/image-framing-option'
import { lengthWarning } from '@/lib/sanity/schema/length-guidance'
import { presetField, presetsOption } from '@/lib/sanity/schema/preset-field'
import { matchPreset } from '@/lib/sanity/schema/preset-match'
import { sectionFields, sectionFieldsets, sectionGroups } from '@/lib/sanity/schema/section-style'
import { joinSubtitle, toneTitle, variantField } from '@/lib/sanity/schema/section-variant'
import {
  choiceField,
  iconDesignFields,
  surfaceFields,
  textStyleField,
} from '@/lib/sanity/schema/surface-design'
import { themeColourField } from '@/lib/sanity/schema/theme-colour'
import {
  LinkListCardsThumbnail,
  LinkListCompactThumbnail,
  LinkListEditorialThumbnail,
  LinkListGlassThumbnail,
  LinkListImageThumbnail,
  LinkListMinimalThumbnail,
} from '@/lib/sanity/schema/thumbnails/link-list-thumbnails'
import { textOrImageFields } from '@/lib/sanity/schema/wordmark'
import { SOCIAL_PLATFORMS, socialPlatformTitle } from '@/lib/social-platforms'

import { linkListDesignFields, withCardContrast } from './link-list-design'
import {
  LINK_LIST_RECOMMENDED_MAX,
  PROFILE_BIO_MAX,
  defaultLinkArrow,
  ownIconShape,
  usesArrow,
} from '../../utils/link-list'
import { enclosingOfArray, memberOfArray } from '../../utils/schema-path'

/** Longest text the design handles. Longer text still publishes, with a warning. */
const LIMITS = {
  // text-h2, balanced over max-w-measure-narrow.
  title: 60,
  // One line of a button on a phone (about 40), and a two-line description under it.
  label: 40,
  // A few words in small capitals over the label.
  eyebrow: 28,
  description: 90,
  name: 50,
  // About one line of small text on a phone each, so four still wrap to two lines.
  category: 24,
} as const

/** More service categories than this read as a paragraph, not a row: Studio warns. */
const CATEGORIES_RECOMMENDED_MAX = 6

/**
 * Points an editor at Service categories when the bio starts with a typed list ("Bodywork •
 * Breathwork • Retreats"), or still repeats the categories. A suggestion only: nothing is moved or
 * hidden for them (the page drops an exact repeat, see `bioParagraphs`).
 */
const bioCategoriesHint = (bio: string | undefined, { parent }: { parent?: unknown }) => {
  const categories = (parent as { categories?: string[] } | undefined)?.categories ?? []
  const firstLine = plainTextParagraphs(bio)[0]?.join(' ') ?? ''
  if (categories.length > 0 && listsCategories(firstLine, categories)) {
    return 'The first line repeats your service categories. Delete it here: the categories already show above the bio.'
  }
  if (categories.length === 0 && looksLikeTypedCategories(bio)) {
    return 'This first line looks like a list of services. Put each one in Service categories above (the dots are added for you), then delete the line here.'
  }
  return true
}

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

/** What an unset field means, so a list that was never touched still matches its preset (Minimal). */
const LINK_LIST_DEFAULTS = {
  variant: 'stacked',
  rowStyle: 'solid',
  thumbnailSize: 'standard',
  'style.align': 'center',
}

/**
 * The list subtitle: "Link list · Image-focused · Contrast · 2 links customised". It names the
 * preset the fields match, or "Custom" and the layout when they no longer do, and how many links
 * change the list's design (README, "Link list": Reading a link's design).
 */
export function linkListSubtitle(fields: {
  variant?: string
  rowStyle?: string
  thumbnailSize?: string
  align?: string
  tone?: string
  links?: readonly { design?: Record<string, unknown> | null }[] | null
}) {
  const preset = matchPreset(
    LINK_LIST_PRESETS,
    {
      variant: fields.variant,
      rowStyle: fields.rowStyle,
      thumbnailSize: fields.thumbnailSize,
      style: { align: fields.align },
    },
    LINK_LIST_DEFAULTS,
  )
  const layout = LINK_LIST_VARIANTS.find((candidate) => candidate.value === fields.variant)
  return joinSubtitle(
    'Link list',
    preset?.title ?? joinSubtitle('Custom', (layout ?? LINK_LIST_VARIANTS[0]).title),
    toneTitle(fields.tone),
    customisedLinksText(countCustomisedLinks(fields.links)),
  )
}

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
export const usesEyebrow = (layout: string) => layout !== 'compact'
/** Editorial links are a ruled list: there is no card surface to colour. */
export const usesSurface = (layout: string) => layout !== 'editorial'
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

interface StoredLinkDesign {
  appearance?: string
  iconShape?: string
}
interface StoredLink {
  icon?: string
  design?: StoredLinkDesign
}

/** The link a field of its Appearance sits in, and that link's section. */
const linkContext = ({ document, path }: Parameters<ConditionalPropertyCallback>[0]) => ({
  link: memberOfArray(document, path, 'links') as StoredLink | undefined,
  section: enclosingOfArray(document, path, 'links') as
    | {
        variant?: string
        rowStyle?: string
        showArrows?: boolean
        linkDesign?: { iconShape?: string; arrowStyle?: string }
      }
    | undefined,
})

/** The Appearance options only show once "Customise this card" is chosen, and only to the agency. */
const notCustomised: ConditionalPropertyCallback = (context) =>
  hiddenFromClients(context) ||
  (context.parent as StoredLinkDesign | undefined)?.appearance !== 'custom'

const notCustomisedOr =
  (
    own: (context: Parameters<ConditionalPropertyCallback>[0]) => boolean,
  ): ConditionalPropertyCallback =>
  (context) =>
    notCustomised(context) || own(context)

const CARD_INHERITS = 'the Link list’s'

/**
 * A link's own Appearance (README, "Link list": Card design and overrides): "Use the Link list design"
 * (unset) or "Customise this card". Customised, every option starts on Inherit, and only what the
 * editor changes differs from the list; the rest keeps following it. Switching back to the list's
 * design keeps the choices (the page ignores them), so trying it loses nothing.
 */
const linkAppearanceField = defineField({
  name: 'design',
  title: 'Appearance',
  type: 'object',
  description:
    'This link follows the Link list’s design (Design tab). Customise it to change only what you pick here.',
  hidden: hiddenFromClients,
  // The summary and the resets above the fields (features/studio/components/link-design-summary-input).
  options: { collapsible: true, collapsed: true, linkDesignSummary: true },
  fieldsets: [
    {
      name: 'card',
      title: scopedTitle(LINK_DESIGN_GROUP_TITLES.card, 'link'),
      options: { collapsible: true, collapsed: false },
    },
    {
      name: 'text',
      title: scopedTitle(LINK_DESIGN_GROUP_TITLES.text, 'link'),
      description: 'Eyebrow, label and description.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'icon',
      title: scopedTitle(LINK_DESIGN_GROUP_TITLES.icon, 'link'),
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'arrow',
      title: scopedTitle(LINK_DESIGN_GROUP_TITLES.arrow, 'link'),
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'appearance',
      title: 'Design',
      type: 'string',
      options: {
        list: [{ value: 'custom', title: 'Customise this card' }],
        layout: 'radio',
        direction: 'horizontal',
        inheritable: 'Use the Link list design',
      },
    }),
    ...surfaceFields({
      inherits: CARD_INHERITS,
      inItem: true,
      fieldset: 'card',
      hidden: notCustomisedOr((context) => {
        const { layout } = looksOfLink(context)
        return !usesSurface(layout)
      }),
    }).map((field) => withCardContrast(field, { inItem: true })),
    choiceField({
      name: 'shadow',
      title: 'Shadow',
      description: 'Flat removes it.',
      values: SHADOW_LEVELS,
      titles: SHADOW_TITLES,
      inherits: `${CARD_INHERITS} (Design › Depth and glow)`,
      fieldset: 'card',
      hidden: notCustomisedOr((context) => looksOfLink(context).layout === 'editorial'),
    }),
    textStyleField({
      element: 'eyebrow',
      inherits: CARD_INHERITS,
      inItem: true,
      fieldset: 'text',
      hidden: notCustomisedOr(
        (context) => !usesEyebrow(looksOfLink(context).layout) || !linkContext(context).link,
      ),
    }),
    textStyleField({
      element: 'label',
      inherits: CARD_INHERITS,
      inItem: true,
      fieldset: 'text',
      hidden: notCustomised,
    }),
    textStyleField({
      element: 'description',
      inherits: CARD_INHERITS,
      inItem: true,
      fieldset: 'text',
      hidden: notCustomisedOr((context) => !usesDescription(looksOfLink(context).layout)),
    }),
    ...iconDesignFields({
      inherits: CARD_INHERITS,
      inItem: true,
      fieldset: 'icon',
      // Only for a link with an icon, in a layout that draws one.
      hidden: notCustomisedOr((context) => {
        const { layout, rowStyle } = looksOfLink(context)
        return !linkContext(context).link?.icon || !usesIcon(layout, rowStyle)
      }),
      shapeOf: (context) => {
        const { link, section } = linkContext(context)
        return (
          link?.design?.iconShape ??
          section?.linkDesign?.iconShape ??
          ownIconShape(section?.variant, section?.rowStyle)
        )
      },
    }),
    choiceField({
      name: 'arrowStyle',
      title: 'Arrow style',
      description: 'None takes the arrow off this link only.',
      values: LINK_ARROWS,
      titles: LINK_ARROW_TITLES,
      inherits: CARD_INHERITS,
      fieldset: 'arrow',
      hidden: notCustomisedOr((context) => !usesArrow(looksOfLink(context).layout)),
    }),
    themeColourField({
      name: 'arrowColour',
      title: 'Arrow colour',
      usage: 'graphic',
      onRows: true,
      inItem: true,
      choices: ['ink', 'muted', 'accent', 'accent-2', 'highlight'],
      inherits: CARD_INHERITS,
      fieldset: 'arrow',
      hidden: notCustomisedOr((context) => {
        const { link, section } = linkContext(context)
        if (!usesArrow(section?.variant)) return true
        const arrow =
          link?.design?.appearance === 'custom' &&
          (link.design as { arrowStyle?: string }).arrowStyle
            ? (link.design as { arrowStyle?: string }).arrowStyle
            : (section?.linkDesign?.arrowStyle ??
              defaultLinkArrow({
                layout: section?.variant,
                rowStyle: section?.rowStyle,
                showArrows: section?.showArrows,
              }))
        return arrow === 'none'
      }),
    }),
  ],
})

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
      name: 'eyebrow',
      type: 'string',
      description: 'A few words above the label, e.g. “New” or “Free guide”. Optional.',
      hidden: hiddenUnlessLayout(usesEyebrow),
      validation: (rule) => lengthWarning(rule, LIMITS.eyebrow, 'Eyebrows'),
    }),
    defineField({
      name: 'label',
      type: 'string',
      description: 'What the button says, e.g. “Book a consultation”.',
      validation: (rule) => [rule.required(), lengthWarning(rule, LIMITS.label, 'Link labels')],
    }),
    defineField({
      name: 'description',
      type: 'string',
      description: 'A short line under the label. Optional.',
      hidden: hiddenUnlessLayout(usesDescription),
      validation: (rule) => lengthWarning(rule, LIMITS.description, 'Descriptions'),
    }),
    defineField({
      name: 'link',
      title: 'Where it goes',
      type: 'link',
      validation: (rule) => rule.required(),
    }),
    badgeIconField({
      description:
        'A small icon beside the label. Optional. In Glass rows it sits beside the picture; in the other layouts a picture replaces it.',
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
    ...textOrImageFields({
      prefix: 'group',
      what: 'the heading above it',
      textField: 'group',
      hidden: ({ parent }) => !(parent as { group?: string } | undefined)?.group?.trim(),
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
          'A picture for this link. Optional. Glass rows show it down the left of the row, beside the icon; Minimal and Cards show it in place of the icon. Use Adjust picture to choose what shows.',
        options: { ...imageOptions, ...framing('linkListThumbnail') },
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
    linkAppearanceField,
  ],
  preview: {
    select: {
      title: 'label',
      design: 'design',
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
      design,
    }: {
      title?: string
      design?: Record<string, unknown>
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
        summariseLinkDesign(design).detail,
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
      ...textOrImageFields({
        prefix: 'heading',
        what: 'the heading',
        textField: 'heading',
        richText: true,
      }),
      defineField({
        name: 'profile',
        type: 'object',
        description:
          'A picture or logo, a name, what you offer and a short line about you. All optional.',
        options: { collapsible: true, collapsed: false },
        fields: [
          imageField({
            name: 'image',
            title: 'Picture or logo',
            description:
              'Shown round unless the Design tab says otherwise. Use Adjust picture to centre a face or mark.',
            options: { ...imageOptions, ...framing('linkListProfile') },
            aspect: '1:1',
            minWidth: 400,
          }),
          defineField({
            name: 'name',
            type: 'string',
            validation: (rule) => lengthWarning(rule, LIMITS.name, 'Names'),
          }),
          ...textOrImageFields({ prefix: 'name', what: 'the name', textField: 'name' }),
          defineField({
            name: 'categories',
            title: 'Service categories',
            type: 'array',
            description:
              'Optional. A few words for what you offer, e.g. Bodywork, Breathwork, Retreats, one per line. They show in a row under the name with a dot between them, so don’t type the dots. Drag to reorder.',
            of: [
              defineArrayMember({
                type: 'string',
                validation: (rule) => [
                  rule.required().error('Type a category, or remove this line.'),
                  lengthWarning(rule, LIMITS.category, 'Categories'),
                ],
              }),
            ],
            validation: (rule) => [
              rule.unique().error('Each category is listed once.'),
              rule
                .max(CATEGORIES_RECOMMENDED_MAX)
                .warning(
                  `More than ${CATEGORIES_RECOMMENDED_MAX} categories is hard to take in at a glance. Keep the ones people look for.`,
                ),
            ],
          }),
          defineField({
            name: 'categoriesVisibility',
            title: 'Show the categories',
            type: 'string',
            description: 'Hide them to take them off the page without deleting them.',
            options: {
              list: [
                { value: 'show', title: 'Show' },
                { value: 'hide', title: 'Hide' },
              ],
              layout: 'radio',
              direction: 'horizontal',
            },
            hidden: ({ parent }: { parent?: { categories?: unknown[] } }) =>
              !parent?.categories?.length,
          }),
          defineField({
            name: 'bio',
            type: 'text',
            rows: 3,
            description: `A line or two, up to ${PROFILE_BIO_MAX} characters. Leave a blank line to start a new paragraph.`,
            validation: (rule) => [
              rule
                .max(PROFILE_BIO_MAX)
                .error(`Keep it to ${PROFILE_BIO_MAX} characters or fewer (it is a short bio).`),
              rule.custom(bioCategoriesHint).warning(),
            ],
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
            .custom(async (value, { parent, getClient }) => {
              const section = parent as { style?: { tone?: string } } | undefined
              // The glass is made from the site's colours, so a changed Brand colour changes the verdict.
              const { colours } = await fetchBrandColours(getClient({ apiVersion: '2025-01-01' }))
              return (
                glassContrastProblem({ tone: section?.style?.tone, strength: value, site: colours })
                  ?.message ?? true
              )
            })
            .warning(),
        ],
      }),
      // Replaced by Design › Links › Arrow style. Kept, hidden, so Glass rows saved with it switched off
      // still draw no arrow (defaultLinkArrow reads it while Arrow style is empty).
      defineField({
        name: 'showArrows',
        title: 'Arrow on each row',
        type: 'boolean',
        hidden: true,
      }),
      ...linkListDesignFields,
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
      rowStyle: 'rowStyle',
      thumbnailSize: 'thumbnailSize',
      align: 'style.align',
      tone: 'style.tone',
      links: 'links',
    },
    prepare: ({
      heading,
      title,
      name,
      ...rest
    }: {
      heading?: Parameters<typeof headingPlainText>[0]
      title?: string
      name?: string
    } & Parameters<typeof linkListSubtitle>[0]) => ({
      title: headingPlainText(heading) || title || name || 'Link list',
      subtitle: linkListSubtitle(rest),
    }),
  },
})
