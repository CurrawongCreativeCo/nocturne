import {
  defineField,
  defineType,
  type ConditionalProperty,
  type ConditionalPropertyCallback,
  type FieldDefinition,
} from 'sanity'

import { customRange, isMotionPreset } from '@/components/motion/presets'
import { backgroundContrastProblem } from '@/lib/color/background-contrast'

import { hiddenFromClients } from '../roles'
import {
  ANCHOR_PATTERN,
  EDGE_CUSTOM_MAX,
  EDGE_CUSTOM_MIN,
  RESERVED_ANCHORS,
  SECTION_MOTION_TITLES,
  MOTION_DELAYS,
  MOTION_DELAY_TITLES,
  MOTION_DIRECTIONS,
  MOTION_DIRECTION_TITLES,
  MOTION_DURATIONS,
  MOTION_DURATION_TITLES,
  MOTION_EASINGS,
  MOTION_EASING_TITLES,
  MOTION_INTENSITIES,
  MOTION_INTENSITY_TITLES,
  MOTION_TRIGGERS,
  MOTION_TRIGGER_TITLES,
  SECTION_ALIGNS,
  SECTION_EDGE_ACCENTS,
  SECTION_EDGE_ACCENT_TITLES,
  SECTION_EDGE_HEIGHTS,
  SECTION_EDGE_HEIGHT_TITLES,
  SECTION_EDGE_LAYERS,
  SECTION_EDGE_LAYER_TITLES,
  SECTION_EDGE_TITLES,
  SECTION_OVERLAY_TITLES,
  defaultOverlayFor,
  SECTION_SPACINGS,
  SECTION_TONE_TITLES,
  SECTION_WIDTHS,
} from '../section-style-options'
import { fetchBrandGradients } from './brand-gradients'
import { imageField } from './image-field'
import { presetField } from './preset-field'
import {
  alignmentHidden,
  backgroundImageHidden,
  edgeFlipHidden,
  edgeInvertHidden,
  edgeLayerHidden,
  edgeOptionsHidden,
  motionCustomHidden,
  motionOptionHidden,
  overlayHidden,
  registerSectionRules,
  sectionAtStylePath,
  staleAlignmentMessage,
  staleMotionMessage,
  visibleMotions,
  type SectionFormRules,
} from './section-form'
import {
  EdgeArchThumbnail,
  EdgeCurveThumbnail,
  EdgeDiagonalThumbnail,
  EdgeLayeredThumbnail,
  EdgeNoneThumbnail,
  EdgeWaveThumbnail,
} from './thumbnails/edge-thumbnails'
import {
  OverlayLightThumbnail,
  OverlayMediumThumbnail,
  OverlayNoneThumbnail,
  OverlayStrongThumbnail,
} from './thumbnails/overlay-thumbnails'
import { animationThumbnails } from './thumbnails/registry'
import {
  ToneAccentThumbnail,
  ToneAltThumbnail,
  ToneInverseThumbnail,
  ToneSurfaceThumbnail,
} from './thumbnails/tone-thumbnails'

/**
 * Layout and style options every page-builder section shares, set by the agency in the section's
 * "Design" tab: Background and Animation as pictures, then a collapsed "Advanced: layout" (space,
 * width, alignment, anchor). The tab and its fields are hidden from clients. SectionFrame (components/ui/section-frame.tsx) turns them into classes; the
 * value lists below are the contract with `resolveSectionStyle` (components/ui/section-style.ts).
 * An empty style renders each section as it always has, so existing content needs no migration.
 * The value lists live in ../section-style-options.ts, which the site can import without Studio.
 */

/** The error for an exact animation value outside the range its preset allows; true when it is fine or empty. */
function motionRangeProblem(
  value: unknown,
  motion: string | undefined,
  field: 'duration' | 'distance' | 'threshold',
  unit: string,
): string | true {
  if (value === undefined || value === null) return true
  if (typeof value !== 'number' || !Number.isInteger(value)) return 'Use a whole number'
  const { min, max } = customRange(isMotionPreset(motion) ? motion : 'reveal', field)
  return value >= min && value <= max ? true : `Use ${min} to ${max} ${unit}`
}

const radio = (values: readonly string[], titles: Record<string, string>) => ({
  list: values.map((value) => ({ title: titles[value] ?? value, value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

declare module 'sanity' {
  interface ObjectOptions {
    /** Show the object's fields without its own title and frame (the Studio field is in features/studio/components/frameless-field). */
    frameless?: boolean
  }
  interface StringOptions {
    /** The field holds the slug of a brand gradient: the Studio draws the picker (features/studio/components/gradient-picker). */
    gradientPicker?: boolean
  }
}

export const sectionStyle = defineType({
  name: 'sectionStyle',
  title: 'Section design',
  type: 'object',
  // The fields are rendered straight into the Design tab, not in a box of their own.
  options: { frameless: true },
  fieldsets: [
    {
      name: 'motionAdvanced',
      title: 'Advanced: animation',
      description: 'Fine-tune the chosen animation. Only the options it uses are shown.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'layoutOptions',
      title: 'Advanced: layout',
      description: 'Space, width, alignment and anchor. The defaults suit most sections.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'edgeAdvanced',
      title: 'Advanced: edge',
      description: 'Turn the shape inside out, or set the height for each screen size.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    presetField({
      name: 'tone',
      title: 'Background',
      description: 'The background and text colours. Everything inside the section follows.',
      required: false,
      options: [
        {
          value: 'surface',
          title: SECTION_TONE_TITLES.surface,
          description: 'The page colour.',
          thumbnail: ToneSurfaceThumbnail,
        },
        {
          value: 'alt',
          title: SECTION_TONE_TITLES.alt,
          description: 'A gentle tint of the page colour, for bands and cards.',
          thumbnail: ToneAltThumbnail,
        },
        {
          value: 'inverse',
          title: SECTION_TONE_TITLES.inverse,
          description:
            'The opposite of the page: light text on dark, or dark on light on a dark site.',
          thumbnail: ToneInverseThumbnail,
        },
        {
          value: 'accent',
          title: SECTION_TONE_TITLES.accent,
          description: 'The Primary brand colour.',
          thumbnail: ToneAccentThumbnail,
        },
      ],
      initialValue: 'surface',
    }),
    defineField({
      name: 'gradient',
      title: 'Gradient',
      description:
        'A brand gradient behind the content, from Design → Brand colours. The background above still sets the text colours. A picture, if you add one, covers it.',
      type: 'string',
      // The picker is hidden altogether while Design settings has no gradients.
      options: { gradientPicker: true },
      validation: (rule) =>
        rule
          .custom(async (value, { getClient, parent }) => {
            const style = parent as { tone?: string; image?: { asset?: unknown } } | undefined
            if (!value || style?.image?.asset) return true
            const gradients = await fetchBrandGradients(getClient({ apiVersion: '2025-01-01' }))
            const chosen = gradients.find((gradient) => gradient.slug === value)
            if (!chosen) {
              return 'This gradient is no longer in Brand colours, so the section shows no gradient. Choose another, or clear it.'
            }
            return (
              backgroundContrastProblem({
                tone: style?.tone,
                hasImage: false,
                gradientStops: chosen.stops,
              })?.message ?? true
            )
          })
          .warning(),
    }),
    imageField({
      name: 'image',
      title: 'Background image',
      description:
        'A picture behind the content, cropped to fill the section; the hotspot you set keeps the subject in view. The picture is decoration, so it needs no alt text.',
      requireAlt: false,
      minWidth: 2000,
      orientation: 'landscape',
      // The hero has its own Image.
      hidden: backgroundImageHidden,
      validation: (rule) =>
        rule
          .custom((value, { parent }) => {
            const style = parent as { tone?: string; overlay?: string } | undefined
            if (!(value as { asset?: unknown } | undefined)?.asset) return true
            return (
              backgroundContrastProblem({
                tone: style?.tone,
                hasImage: true,
                overlay: style?.overlay,
              })?.message ?? true
            )
          })
          .warning(),
    }),
    presetField({
      name: 'overlay',
      title: 'Overlay',
      description:
        'Lays the background colour over the picture so the text stays readable. Dark backgrounds start at Medium, the others at Light.',
      required: false,
      options: [
        {
          value: 'none',
          title: SECTION_OVERLAY_TITLES.none,
          description: 'The picture as it is.',
          thumbnail: OverlayNoneThumbnail,
        },
        {
          value: 'light',
          title: SECTION_OVERLAY_TITLES.light,
          description: 'A gentle tint.',
          thumbnail: OverlayLightThumbnail,
        },
        {
          value: 'medium',
          title: SECTION_OVERLAY_TITLES.medium,
          description: 'Calms most pictures.',
          thumbnail: OverlayMediumThumbnail,
        },
        {
          value: 'strong',
          title: SECTION_OVERLAY_TITLES.strong,
          description: 'The picture is a texture.',
          thumbnail: OverlayStrongThumbnail,
        },
      ],
      // Only with a picture, and never on a layout that has its own.
      hidden: overlayHidden,
      defaultValue: ({ document, path }) =>
        defaultOverlayFor(
          (sectionAtStylePath(document, path)?.style as { tone?: string } | undefined)?.tone,
        ),
    }),
    presetField({
      name: 'motion',
      title: 'Animation',
      description:
        'How the section appears as it scrolls into view. Skipped for visitors who ask for less motion. The first section of a page stays still unless you choose On load in the options below.',
      required: false,
      options: [
        {
          value: 'none',
          title: SECTION_MOTION_TITLES.none,
          description: 'Appears with the page.',
          thumbnail: animationThumbnails.none,
        },
        {
          value: 'reveal',
          title: SECTION_MOTION_TITLES.reveal,
          description: 'Fades in and rises 24 px, once.',
          thumbnail: animationThumbnails.reveal,
        },
        {
          value: 'subtle',
          title: SECTION_MOTION_TITLES.subtle,
          description: 'Fades in and rises 12 px, once.',
          thumbnail: animationThumbnails.subtle,
        },
        {
          value: 'fade',
          title: SECTION_MOTION_TITLES.fade,
          description: 'Fades in, with no movement.',
          thumbnail: animationThumbnails.fade,
        },
        {
          value: 'slide',
          title: SECTION_MOTION_TITLES.slide,
          description: 'Slides in from the start side.',
          thumbnail: animationThumbnails.slide,
        },
        {
          value: 'stagger',
          title: SECTION_MOTION_TITLES.stagger,
          description: 'Its parts appear one after another.',
          thumbnail: animationThumbnails.stagger,
        },
        {
          value: 'float',
          title: SECTION_MOTION_TITLES.float,
          description: 'The picture drifts slowly in a loop.',
          thumbnail: animationThumbnails.float,
        },
        {
          value: 'parallax',
          title: SECTION_MOTION_TITLES.parallax,
          description: 'The picture drifts a little as the page scrolls.',
          thumbnail: animationThumbnails.parallax,
        },
        {
          value: 'parallaxMedium',
          title: SECTION_MOTION_TITLES.parallaxMedium,
          description: 'A clearer drift as the page scrolls.',
          thumbnail: animationThumbnails.parallaxMedium,
        },
        {
          value: 'parallaxStrong',
          title: SECTION_MOTION_TITLES.parallaxStrong,
          description: 'A strong drift. Use on one picture per page.',
          thumbnail: animationThumbnails.parallaxStrong,
        },
      ],
      initialValue: 'reveal',
      // Float and Parallax move a picture, so they are only offered on layouts that have one.
      visibleOptions: ({ document, path }) =>
        visibleMotions(sectionAtStylePath(document, path as never)),
      validation: (rule) =>
        rule.custom((value, context) => staleMotionMessage(value, context)).warning(),
    }),
    defineField({
      name: 'motionIntensity',
      title: 'Intensity',
      description: 'Scales how far the picture travels. Normal is the strength you chose above.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'normal',
      options: radio(MOTION_INTENSITIES, MOTION_INTENSITY_TITLES),
      hidden: motionOptionHidden('intensity'),
    }),
    defineField({
      name: 'motionDuration',
      title: 'Duration',
      description: 'How long it takes. For Float, how long one drift takes.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'normal',
      options: radio(MOTION_DURATIONS, MOTION_DURATION_TITLES),
      hidden: motionOptionHidden('duration'),
    }),
    defineField({
      name: 'motionDelay',
      title: 'Delay',
      description: 'A pause before it starts.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'none',
      options: radio(MOTION_DELAYS, MOTION_DELAY_TITLES),
      hidden: motionOptionHidden('delay'),
    }),
    defineField({
      name: 'motionDirection',
      title: 'Direction',
      description: 'Where it slides in from. The start is the left in English.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'start',
      options: radio(MOTION_DIRECTIONS, MOTION_DIRECTION_TITLES),
      hidden: motionOptionHidden('direction'),
    }),
    defineField({
      name: 'motionTrigger',
      title: 'When it plays',
      description:
        'The first section of a page stays still unless this is On load, and then it slides or rises without fading, so its heading and picture are never hidden.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'view',
      options: radio(MOTION_TRIGGERS, MOTION_TRIGGER_TITLES),
      hidden: motionOptionHidden('trigger'),
    }),
    defineField({
      name: 'motionCustom',
      title: 'Set exact values',
      description: 'Type the timing and distance yourself instead of using the choices above.',
      type: 'boolean',
      fieldset: 'motionAdvanced',
      initialValue: false,
      hidden: motionOptionHidden('custom'),
    }),
    defineField({
      name: 'motionDurationMs',
      title: 'Duration (milliseconds)',
      type: 'number',
      fieldset: 'motionAdvanced',
      hidden: motionCustomHidden('duration'),
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          motionRangeProblem(
            value,
            (parent as { motion?: string } | undefined)?.motion,
            'duration',
            'ms',
          ),
        ),
    }),
    defineField({
      name: 'motionDistancePx',
      title: 'Distance (pixels)',
      description: 'How far it travels.',
      type: 'number',
      fieldset: 'motionAdvanced',
      hidden: motionCustomHidden('distance'),
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          motionRangeProblem(
            value,
            (parent as { motion?: string } | undefined)?.motion,
            'distance',
            'px',
          ),
        ),
    }),
    defineField({
      name: 'motionEasing',
      title: 'Easing',
      description: 'The feel of the movement.',
      type: 'string',
      fieldset: 'motionAdvanced',
      initialValue: 'easeOut',
      options: {
        list: MOTION_EASINGS.map((value) => ({ title: MOTION_EASING_TITLES[value], value })),
        layout: 'dropdown',
      },
      hidden: motionCustomHidden('easing'),
    }),
    defineField({
      name: 'motionThreshold',
      title: 'How much must be in view (%)',
      description: 'The share of the section that has to be on screen before it plays.',
      type: 'number',
      fieldset: 'motionAdvanced',
      hidden: motionCustomHidden('threshold'),
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          motionRangeProblem(
            value,
            (parent as { motion?: string } | undefined)?.motion,
            'threshold',
            '%',
          ),
        ),
    }),
    presetField({
      name: 'edge',
      title: 'Bottom edge',
      description:
        'The shape of this section’s bottom edge. The section below shows through the cut, whatever its background, and moves up to meet it.',
      required: false,
      options: [
        {
          value: 'none',
          title: SECTION_EDGE_TITLES.none,
          description: 'A straight edge.',
          thumbnail: EdgeNoneThumbnail,
        },
        {
          value: 'diagonal',
          title: SECTION_EDGE_TITLES.diagonal,
          description: 'A slanted cut.',
          thumbnail: EdgeDiagonalThumbnail,
        },
        {
          value: 'wave',
          title: SECTION_EDGE_TITLES.wave,
          description: 'One soft wave.',
          thumbnail: EdgeWaveThumbnail,
        },
        {
          value: 'curve',
          title: SECTION_EDGE_TITLES.curve,
          description: 'The section bulges down.',
          thumbnail: EdgeCurveThumbnail,
        },
        {
          value: 'arch',
          title: SECTION_EDGE_TITLES.arch,
          description: 'A rounded doorway.',
          thumbnail: EdgeArchThumbnail,
        },
        {
          value: 'layered',
          title: SECTION_EDGE_TITLES.layered,
          description: 'Two waves, one behind the other.',
          thumbnail: EdgeLayeredThumbnail,
        },
      ],
      initialValue: 'none',
    }),
    defineField({
      name: 'edgeHeight',
      title: 'Edge height',
      description: 'Smaller on phones.',
      type: 'string',
      initialValue: 'medium',
      options: radio(SECTION_EDGE_HEIGHTS, SECTION_EDGE_HEIGHT_TITLES),
      hidden: edgeOptionsHidden,
    }),
    defineField({
      name: 'edgeFlip',
      title: 'Flip',
      description: 'Mirror the shape left to right.',
      type: 'boolean',
      initialValue: false,
      hidden: edgeFlipHidden,
    }),
    defineField({
      name: 'edgeAccent',
      title: 'Accent line',
      description: 'A thin line in a brand colour along the edge.',
      type: 'string',
      initialValue: 'none',
      options: radio(SECTION_EDGE_ACCENTS, SECTION_EDGE_ACCENT_TITLES),
      hidden: edgeOptionsHidden,
    }),
    defineField({
      name: 'edgeLayer',
      title: 'Back wave colour',
      description: 'Drawn behind the front wave, partly see-through.',
      type: 'string',
      initialValue: 'accent-2',
      options: radio(SECTION_EDGE_LAYERS, SECTION_EDGE_LAYER_TITLES),
      hidden: edgeLayerHidden,
    }),
    defineField({
      name: 'edgeInvert',
      title: 'Invert',
      description: 'The shape bulges into the next section instead.',
      type: 'boolean',
      fieldset: 'edgeAdvanced',
      initialValue: false,
      hidden: edgeInvertHidden,
    }),
    ...(
      [
        ['edgeHeightMobile', 'Height on phones'],
        ['edgeHeightTablet', 'Height on tablets'],
        ['edgeHeightDesktop', 'Height on desktops'],
      ] as const
    ).map(([name, title]) =>
      defineField({
        name,
        title,
        description: `In pixels, ${EDGE_CUSTOM_MIN} to ${EDGE_CUSTOM_MAX}. Leave empty to use the edge height above (a screen size left empty keeps the smaller one’s).`,
        type: 'number',
        fieldset: 'edgeAdvanced',
        hidden: edgeOptionsHidden,
        validation: (rule) => rule.integer().min(EDGE_CUSTOM_MIN).max(EDGE_CUSTOM_MAX),
      }),
    ),
    defineField({
      name: 'spacing',
      title: 'Space above and below',
      type: 'string',
      fieldset: 'layoutOptions',
      initialValue: 'default',
      options: radio(SECTION_SPACINGS, {
        compact: 'Compact',
        default: 'Default',
        spacious: 'Spacious',
      }),
    }),
    defineField({
      name: 'width',
      title: 'Content width',
      type: 'string',
      fieldset: 'layoutOptions',
      initialValue: 'default',
      options: radio(SECTION_WIDTHS, {
        narrow: 'Narrow',
        default: 'Default',
        wide: 'Wide',
        full: 'Full width',
      }),
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      description: 'Headings and intro text.',
      type: 'string',
      fieldset: 'layoutOptions',
      options: radio(SECTION_ALIGNS, { start: 'Start', center: 'Centre' }),
      // Layouts that set their own alignment don't offer it.
      hidden: alignmentHidden,
      validation: (rule) =>
        rule.custom((value, context) => staleAlignmentMessage(value, context)).warning(),
    }),
    defineField({
      name: 'anchorId',
      title: 'Anchor',
      description:
        'Lets links jump to this section: "pricing" is reached with #pricing. Lowercase letters, numbers and hyphens; each one can be used once per page.',
      type: 'string',
      fieldset: 'layoutOptions',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          if (!ANCHOR_PATTERN.test(value)) {
            return 'Start with a letter, then lowercase letters, numbers and single hyphens'
          }
          return RESERVED_ANCHORS.includes(value) ? `"${value}" is used by the site itself` : true
        }),
    }),
  ],
})

/**
 * Every section's field groups: its content first, then the agency's Design tab. The Design tab is
 * hidden from clients (UI only: see README, "Studio roles and permissions").
 */
export const sectionGroups = [
  { name: 'content', title: 'Content', default: true },
  { name: 'design', title: 'Design', hidden: hiddenFromClients },
]

/**
 * Add as a section type's `fieldsets`. "Advanced" holds the section's `advanced` fields (see
 * sectionFields); Studio leaves it out of the form when none of them apply to the chosen layout.
 */
export const sectionFieldsets = [
  {
    name: 'advanced',
    title: 'Advanced',
    group: 'design',
    options: { collapsible: true, collapsed: true },
  },
]

/** What a section starts with when an editor adds it. Unset fields keep the section's own look. */
export type SectionStyleInitialValue = Partial<
  Record<'tone' | 'spacing' | 'width' | 'align' | 'motion', string>
>

export interface SectionFormOptions {
  /**
   * Which options suit which layout, registered under the section's `_type`. Without it the section
   * has no picture (no Parallax) and every other option is offered.
   */
  rules?: SectionFormRules & { type: string }
  /**
   * Agency-only fields for the Advanced fieldset. Each is shown only while its own `hidden` says so;
   * the fieldset disappears when none are, and for clients.
   */
  advanced?: FieldDefinition[]
}

function hiddenFor(own: ConditionalProperty | undefined): ConditionalPropertyCallback {
  return (context) =>
    hiddenFromClients(context) || (typeof own === 'function' ? own(context) : (own ?? false))
}

/**
 * A section's `fields`, in the order editors meet them: the layout picker (`variant`) first, because
 * the layout decides which fields matter, then the section's own fields in the Content group, then
 * the shared `style` in Design (agency only), then any `advanced` fields. `initial` sets how this kind
 * of section starts (a hero starts dark); pass the same values to SectionFrame's `defaults` so a
 * section without a style looks like a new one. Add `fieldsets: sectionFieldsets` to the type.
 */
export function sectionFields(
  content: FieldDefinition[],
  initial: SectionStyleInitialValue = {},
  { rules, advanced = [] }: SectionFormOptions = {},
): FieldDefinition[] {
  if (rules) registerSectionRules(rules.type, rules)

  const layout = content.filter((field) => field.name === 'variant')
  const rest = content.filter((field) => field.name !== 'variant')

  return [
    // A field that names its own group keeps it.
    ...[...layout, ...rest].map((field) => ({ ...field, group: field.group ?? 'content' })),
    defineField({
      name: 'style',
      title: 'Design',
      type: 'sectionStyle',
      group: 'design',
      hidden: hiddenFromClients,
      initialValue: initial,
    }),
    ...advanced.map((field) => ({
      ...field,
      group: 'design',
      fieldset: 'advanced',
      hidden: hiddenFor(field.hidden),
    })),
  ]
}
