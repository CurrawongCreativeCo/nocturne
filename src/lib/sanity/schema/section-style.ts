import {
  defineField,
  defineType,
  type ConditionalProperty,
  type ConditionalPropertyCallback,
  type FieldDefinition,
} from 'sanity'

import { customRange, isMotionPreset } from '@/components/motion/presets'
import { backgroundContrastProblem } from '@/lib/color/background-contrast'
import { overlayGradientContrastProblem } from '@/lib/color/overlay-gradient-contrast'

import {
  GRADIENT_OPACITY_RANGE,
  GRADIENT_STOP_COLOURS,
  GRADIENT_STOP_TITLES,
  OVERLAY_GRADIENTS,
  OVERLAY_GRADIENT_DESCRIPTIONS,
  OVERLAY_GRADIENT_TITLES,
  inheritedStopOpacity,
  resolveOverlayGradient,
  type GradientStop,
  type OverlayGradientInput,
} from '../overlay-gradient'
import { hiddenFromClients } from '../roles'
import {
  PANEL_STRENGTHS,
  PANEL_STRENGTH_TITLES,
  SECTION_PANEL_TITLES,
  panelProblem,
  pictureOverlay,
} from '../section-panel'
import {
  ANCHOR_PATTERN,
  EDGE_CUSTOM_MAX,
  EDGE_CUSTOM_MIN,
  RESERVED_ANCHORS,
  SECTION_OVERLAYS,
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
  imageStrengthOpacity,
  SECTION_IMAGE_HORIZONTAL_TITLES,
  SECTION_IMAGE_HORIZONTALS,
  SECTION_IMAGE_REPEAT_TITLES,
  SECTION_IMAGE_REPEATS,
  SECTION_IMAGE_SIZE_TITLES,
  SECTION_IMAGE_STRENGTH_CUSTOM,
  SECTION_IMAGE_STRENGTH_OPACITY,
  SECTION_IMAGE_STRENGTH_TITLES,
  SECTION_IMAGE_VERTICAL_TITLES,
  SECTION_IMAGE_VERTICALS,
  SECTION_OVERLAY_TITLES,
  SECTION_WASH_TITLES,
  defaultOverlayFor,
  SECTION_SPACINGS,
  SECTION_TONE_TITLES,
  SECTION_WIDTHS,
} from '../section-style-options'
import { fetchBrandColours } from './brand-colours'
import { fetchBrandGradients } from './brand-gradients'
import { imageField } from './image-field'
import { presetField } from './preset-field'
import {
  alignmentHidden,
  backgroundImageHidden,
  imageOptionHidden,
  staleImageOptionMessage,
  edgeFlipHidden,
  edgeInvertHidden,
  edgeLayerHidden,
  edgeOptionsHidden,
  motionCustomHidden,
  motionOptionHidden,
  overlayHidden,
  panelHidden,
  panelStrengthHidden,
  registerSectionRules,
  sectionAtStylePath,
  sectionHasOwnBackground,
  staleAlignmentMessage,
  staleMotionMessage,
  visibleMotions,
  type SectionFormRules,
} from './section-form'
import {
  ImageSizeActualThumbnail,
  ImageSizeContainThumbnail,
  ImageSizeCoverThumbnail,
  ImageSizeScreenThumbnail,
  ImageStrengthFaintThumbnail,
  ImageStrengthFullThumbnail,
  ImageStrengthSoftThumbnail,
  WashBackgroundThumbnail,
  WashDarkThumbnail,
  WashGradientThumbnail,
  WashLightThumbnail,
  overlayGradientThumbnails,
} from './thumbnails/background-image-thumbnails'
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
  PanelGlassThumbnail,
  PanelNoneThumbnail,
  PanelSolidThumbnail,
} from './thumbnails/section-panel-thumbnails'
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

type StyleWithGradient = OverlayGradientInput & {
  overlay?: string
  overlayColor?: string
  tone?: string
  imageStrength?: string
  imageStrengthPercent?: number
}

/** The gradient's options only show while the overlay colour is Gradient (and there is an overlay). */
const gradientHidden: ConditionalPropertyCallback = (context) => {
  const style = context.parent as StyleWithGradient | undefined
  return overlayHidden(context) || style?.overlayColor !== 'gradient' || style.overlay === 'none'
}

const STOP_TITLES: Record<GradientStop, string> = {
  top: 'Top',
  middle: 'Middle',
  bottom: 'Bottom',
}

/** One stop of the gradient overlay (Advanced): a colour and an opacity, each following the preset while empty. */
function gradientStopField(stop: GradientStop) {
  return defineField({
    name: `overlayGradient${STOP_TITLES[stop]}`,
    title: `${STOP_TITLES[stop]} of the gradient`,
    description:
      stop === 'top'
        ? 'For Focused centre, the top is the centre and the bottom the edges.'
        : undefined,
    type: 'object',
    fieldset: 'gradientAdvanced',
    hidden: gradientHidden,
    options: { collapsible: false },
    fields: [
      defineField({
        name: 'colour',
        title: 'Colour',
        type: 'string',
        options: {
          list: GRADIENT_STOP_COLOURS.map((value) => ({
            value,
            title: GRADIENT_STOP_TITLES[value],
          })),
          layout: 'radio',
          direction: 'horizontal',
          inheritable: 'As the preset',
        },
      }),
      defineField({
        name: 'hex',
        title: 'Custom colour',
        type: 'string',
        options: { colourPicker: true },
        hidden: ({ parent }: { parent?: { colour?: string } }) => parent?.colour !== 'custom',
        validation: (rule) =>
          rule.custom((value, { parent }) =>
            (parent as { colour?: string } | undefined)?.colour !== 'custom' ||
            (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value))
              ? true
              : 'Choose a colour. Until then this stop keeps the preset’s.',
          ),
      }),
      defineField({
        name: 'opacity',
        title: 'Opacity',
        type: 'number',
        description: 'Empty follows the preset at the overlay strength above.',
        options: {
          slider: {
            ...GRADIENT_OPACITY_RANGE,
            step: 1,
            unit: '%',
            // The shape and the overlay's strength decide it while empty.
            inherited: ({ container }) => {
              const style = container as StyleWithGradient | undefined
              const level =
                SECTION_OVERLAYS.find((value) => value === style?.overlay) ??
                defaultOverlayFor(style?.tone)
              return level === 'none' ? undefined : inheritedStopOpacity(style, stop, level)
            },
          },
        },
        validation: (rule) =>
          rule.integer().min(GRADIENT_OPACITY_RANGE.min).max(GRADIENT_OPACITY_RANGE.max),
      }),
    ],
  })
}

/** Adds the Studio's preview over the section's own picture below the gradient picker. */
function withOverlayPreview<T extends { options?: object }>(field: T): T {
  return { ...field, options: { ...field.options, overlayPreview: true } }
}

const radio = (values: readonly string[], titles: Record<string, string>) => ({
  list: values.map((value) => ({ title: titles[value] ?? value, value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

declare module 'sanity' {
  interface NumberOptions {
    /** Draw the number as a slider (features/studio/components/slider-input). */
    slider?: {
      min: number
      max: number
      step: number
      unit: string
      /**
       * What the value is while unset, and where it comes from, read from `container`: the object
       * above the number's own object (a gradient stop's section style). The Studio shows it on the slider.
       */
      inherited?: (context: { container: unknown }) => { value: number; source: string } | undefined
    }
  }
  interface ObjectOptions {
    /** Show the object's fields without its own title and frame (the Studio field is in features/studio/components/frameless-field). */
    frameless?: boolean
  }
  interface StringOptions {
    /** The field holds the slug of a brand gradient: the Studio draws the picker (features/studio/components/gradient-picker). */
    gradientPicker?: boolean
    /** A six-digit hex with the Brand colours input's picker and no contrast check (features/site/components/colour-input). */
    colourPicker?: boolean
    /** The gradient overlay's shape: the Studio adds a preview over the section's own picture (features/studio/components/overlay-preview). */
    overlayPreview?: boolean
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
      name: 'backgroundAdvanced',
      title: 'Advanced: background',
      description:
        'Where the picture sits, whether it repeats, an exact strength, and keeping it still while the page scrolls. Only the options that apply are shown.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'gradientAdvanced',
      title: 'Advanced: gradient',
      description:
        'The colour and opacity of the top, middle and bottom of the gradient. Anything left empty follows the gradient chosen above.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'panelAdvanced',
      title: 'Advanced: panel',
      description:
        'How see-through the glass starts. It is made more solid where the text needs it.',
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
          .custom(async (value, { parent, getClient }) => {
            const style = parent as StyleWithGradient | undefined
            if (!(value as { asset?: unknown } | undefined)?.asset) return true
            const strength = imageStrengthOpacity(style?.imageStrength, style?.imageStrengthPercent)
            if (style?.overlayColor === 'gradient') {
              const level = style.overlay ?? defaultOverlayFor(style.tone)
              if (level === 'none') return true
              const { colours } = await fetchBrandColours(getClient({ apiVersion: '2025-01-01' }))
              return (
                overlayGradientContrastProblem({
                  tone: style.tone,
                  gradient: resolveOverlayGradient(style, level as 'light' | 'medium' | 'strong'),
                  strength,
                  site: colours,
                })?.message ?? true
              )
            }
            return (
              backgroundContrastProblem({
                tone: style?.tone,
                hasImage: true,
                overlay: style?.overlay,
                wash: style?.overlayColor,
                strength,
              })?.message ?? true
            )
          })
          .warning(),
    }),
    presetField({
      name: 'imageSize',
      title: 'Picture size',
      description:
        'Fill the section crops the picture to the section; Cover the screen sizes it to the window and keeps it in view while the content scrolls; Show the whole picture fits all of it in; Actual size draws it at its own size, for small patterns.',
      required: false,
      options: [
        {
          value: 'cover',
          title: SECTION_IMAGE_SIZE_TITLES.cover,
          description: 'Cropped to fill, the hotspot kept in view.',
          thumbnail: ImageSizeCoverThumbnail,
        },
        {
          value: 'screen',
          title: SECTION_IMAGE_SIZE_TITLES.screen,
          description:
            'The window’s size, held still as the content scrolls. Best behind a long list. The section is at least the window’s height.',
          thumbnail: ImageSizeScreenThumbnail,
        },
        {
          value: 'contain',
          title: SECTION_IMAGE_SIZE_TITLES.contain,
          description: 'All of it, with space around if the shapes differ.',
          thumbnail: ImageSizeContainThumbnail,
        },
        {
          value: 'actual',
          title: SECTION_IMAGE_SIZE_TITLES.actual,
          description: 'Not scaled. Can repeat.',
          thumbnail: ImageSizeActualThumbnail,
        },
      ],
      initialValue: null,
      hidden: overlayHidden,
      defaultValue: () => 'cover',
    }),
    presetField({
      name: 'imageStrength',
      title: 'Picture strength',
      description: 'How much of the picture shows. Less lets the background colour through.',
      required: false,
      options: [
        {
          value: 'full',
          title: SECTION_IMAGE_STRENGTH_TITLES.full,
          description: 'The picture as it is.',
          thumbnail: ImageStrengthFullThumbnail,
        },
        {
          value: 'soft',
          title: SECTION_IMAGE_STRENGTH_TITLES.soft,
          description: `${SECTION_IMAGE_STRENGTH_OPACITY.soft * 100}% of the picture.`,
          thumbnail: ImageStrengthSoftThumbnail,
        },
        {
          value: 'faint',
          title: SECTION_IMAGE_STRENGTH_TITLES.faint,
          description: `${SECTION_IMAGE_STRENGTH_OPACITY.faint * 100}%, for a quiet pattern.`,
          thumbnail: ImageStrengthFaintThumbnail,
        },
      ],
      initialValue: null,
      hidden: overlayHidden,
      defaultValue: () => 'full',
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
      name: 'overlayColor',
      title: 'Overlay colour',
      description:
        'The colour laid over the picture at the strength above. The text colours still follow the background.',
      required: false,
      options: [
        {
          value: 'background',
          title: SECTION_WASH_TITLES.background,
          description: 'The section’s own colour.',
          thumbnail: WashBackgroundThumbnail,
        },
        {
          value: 'light',
          title: SECTION_WASH_TITLES.light,
          description: 'White, whatever the background.',
          thumbnail: WashLightThumbnail,
        },
        {
          value: 'dark',
          title: SECTION_WASH_TITLES.dark,
          description: 'Near black, whatever the background.',
          thumbnail: WashDarkThumbnail,
        },
        {
          value: 'gradient',
          title: SECTION_WASH_TITLES.gradient,
          description: 'Brand colours that deepen across the picture.',
          thumbnail: WashGradientThumbnail,
        },
      ],
      initialValue: null,
      hidden: overlayHidden,
      defaultValue: () => 'background',
    }),
    withOverlayPreview(
      presetField({
        name: 'overlayGradient',
        title: 'Gradient',
        description:
          'Made from this site’s colours, at the overlay strength above (Light, Medium or Strong). The preview below uses this section’s picture.',
        required: false,
        initialValue: null,
        options: OVERLAY_GRADIENTS.map((value) => ({
          value,
          title: OVERLAY_GRADIENT_TITLES[value],
          description: OVERLAY_GRADIENT_DESCRIPTIONS[value],
          thumbnail: overlayGradientThumbnails[value],
        })),
        hidden: gradientHidden,
        defaultValue: () => 'deepen',
      }),
    ),
    gradientStopField('top'),
    gradientStopField('middle'),
    gradientStopField('bottom'),
    defineField({
      name: 'imageVertical',
      title: 'Position: up and down',
      description: 'Middle if left empty.',
      type: 'string',
      fieldset: 'backgroundAdvanced',
      options: radio(SECTION_IMAGE_VERTICALS, SECTION_IMAGE_VERTICAL_TITLES),
      hidden: imageOptionHidden('position'),
      validation: (rule) =>
        rule
          .custom((value, context) => staleImageOptionMessage('position', value, context))
          .warning(),
    }),
    defineField({
      name: 'imageHorizontal',
      title: 'Position: left and right',
      description: 'Centre if left empty.',
      type: 'string',
      fieldset: 'backgroundAdvanced',
      options: radio(SECTION_IMAGE_HORIZONTALS, SECTION_IMAGE_HORIZONTAL_TITLES),
      hidden: imageOptionHidden('position'),
      validation: (rule) =>
        rule
          .custom((value, context) => staleImageOptionMessage('position', value, context))
          .warning(),
    }),
    defineField({
      name: 'imageRepeat',
      title: 'Repeat',
      description: 'Tile a small picture across the section. No repeat if left empty.',
      type: 'string',
      fieldset: 'backgroundAdvanced',
      options: radio(SECTION_IMAGE_REPEATS, SECTION_IMAGE_REPEAT_TITLES),
      hidden: imageOptionHidden('repeat'),
      validation: (rule) =>
        rule
          .custom((value, context) => staleImageOptionMessage('repeat', value, context))
          .warning(),
    }),
    defineField({
      name: 'imageStrengthPercent',
      title: 'Exact strength (%)',
      description: `Instead of the picture strength above, ${SECTION_IMAGE_STRENGTH_CUSTOM.min} to ${SECTION_IMAGE_STRENGTH_CUSTOM.max}. Leave empty to use it.`,
      type: 'number',
      fieldset: 'backgroundAdvanced',
      hidden: imageOptionHidden('any'),
      validation: (rule) =>
        rule
          .integer()
          .min(SECTION_IMAGE_STRENGTH_CUSTOM.min)
          .max(SECTION_IMAGE_STRENGTH_CUSTOM.max),
    }),
    defineField({
      name: 'imageFixed',
      title: 'Stays put while scrolling',
      description:
        'The picture holds still as the page moves over it. Large screens only, and not for visitors who ask for less motion.',
      type: 'boolean',
      fieldset: 'backgroundAdvanced',
      initialValue: false,
      // Cover the screen already holds the picture still.
      hidden: imageOptionHidden('fixed'),
    }),
    presetField({
      name: 'panel',
      title: 'Panel',
      description:
        'Puts the content on a panel over the background, tinted from the background colour. Glass blurs only where a picture or gradient is behind it. Text colours follow automatically; where they could not be read, the panel is drawn solid.',
      required: false,
      options: [
        {
          value: 'none',
          title: SECTION_PANEL_TITLES.none,
          description: 'The content sits straight on the background.',
          thumbnail: PanelNoneThumbnail,
        },
        {
          value: 'glass',
          title: SECTION_PANEL_TITLES.glass,
          description: 'A see-through panel, frosted over pictures.',
          thumbnail: PanelGlassThumbnail,
        },
        {
          value: 'solid',
          title: SECTION_PANEL_TITLES.solid,
          description: 'An opaque card.',
          thumbnail: PanelSolidThumbnail,
        },
      ],
      // Unset is None: a section with no choice looks as it always has.
      initialValue: null,
      defaultValue: () => 'none',
      hidden: panelHidden,
      validation: (rule) =>
        rule
          .custom(async (value, { getClient, parent, document, path }) => {
            const style = parent as
              | {
                  tone?: string
                  gradient?: string
                  edge?: string
                  motion?: string
                  panelStrength?: string
                  image?: { asset?: unknown }
                  overlay?: string
                  overlayColor?: string
                  imageStrength?: string
                  imageStrengthPercent?: number
                }
              | undefined
            if (value !== 'glass' && value !== 'solid') return true
            const section = sectionAtStylePath(document, path)
            const client = getClient({ apiVersion: '2025-01-01' })
            // The site's colours and gradients, as the page draws them: the same inputs as the site.
            const [{ colours }, gradients] = await Promise.all([
              fetchBrandColours(client),
              fetchBrandGradients(client),
            ])
            return (
              panelProblem({
                panel: value,
                strength: style?.panelStrength,
                tone: style?.tone,
                hasPicture: Boolean(style?.image?.asset),
                overlay: pictureOverlay(style, style?.tone),
                gradient: style?.gradient,
                gradients,
                site: colours,
                hasOwnBackground: sectionHasOwnBackground(section),
                overlaps:
                  Boolean(style?.edge && style.edge !== 'none') ||
                  style?.motion === 'parallax' ||
                  style?.motion === 'float',
              }) ?? true
            )
          })
          .warning(),
    }),
    defineField({
      name: 'panelStrength',
      title: 'Glass strength',
      description:
        'How much of the panel colour shows. Unset follows the site’s glass (Medium). The panel still gets more solid where the text needs it.',
      type: 'string',
      fieldset: 'panelAdvanced',
      options: {
        list: PANEL_STRENGTHS.map((value) => ({ value, title: PANEL_STRENGTH_TITLES[value] })),
        layout: 'radio',
      },
      hidden: panelStrengthHidden,
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
      name: 'fillScreen',
      title: 'At least the screen’s height',
      description:
        'The section is at least as tall as the window, with its content centred up and down; long content still scrolls. To cover the window with a background picture and leave the content at the top, choose Picture size › Cover the screen instead.',
      type: 'boolean',
      fieldset: 'layoutOptions',
      initialValue: false,
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
