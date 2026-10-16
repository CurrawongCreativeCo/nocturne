import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import { TRAVEL_MAX, TRAVEL_MIN, SCALE_MAX, SCALE_MIN } from '@/components/motion/image-travel'

import {
  FRAME_INSET,
  IMAGE_APPEARANCES,
  IMAGE_APPEARANCE_TITLES,
  IMAGE_DIRECTIONS,
  IMAGE_DIRECTION_TITLES,
  IMAGE_FRAMES,
  IMAGE_FRAME_COLOURS,
  IMAGE_FRAME_COLOUR_TITLES,
  IMAGE_FRAME_TITLES,
  IMAGE_MOTIONS,
  IMAGE_MOTION_TITLES,
  appearanceFromHeroShape,
  imageDesignUses,
  showsFrame,
  type ImageAppearance,
  type ImageDesignShape,
} from '../image-design-options'
import { hiddenFromClients } from '../roles'
import { presetField, type PresetOptionsContext } from './preset-field'
import { sectionAtStylePath } from './section-form'
import {
  imageAppearanceThumbnails,
  imageFrameThumbnails,
  imageMotionThumbnails,
} from './thumbnails/registry'

/**
 * The shared `imageDesign` object: how a section's picture looks and moves (README, "Image design").
 * Three pictures to choose from, then a collapsed "More image options" for the exact values:
 *
 *   Appearance  Standard, Rounded, Circle, Arch or Framed (Square corners where a section already had it)
 *   Motion      None, Subtle parallax or Medium parallax; the exact values are Custom, in Advanced
 *   Frame       None, Simple line, a built-in frame or an approved custom one; only for Framed
 *
 * FramedImage (components/ui/framed-image.tsx) draws it. Add it with `imageDesignField()` only where
 * the effect makes sense (a section's main pictures), never on logos, icons or small avatars. Agency
 * only, like the rest of Design; leave it empty and the picture looks as it always did.
 */

/** The values stored beside the object, which tell what the section would draw without a choice. */
interface Section {
  _type?: string
  imageShape?: string
}

const sectionOf = ({ document, path }: PresetOptionsContext): Section | undefined =>
  sectionAtStylePath(document, path)

/**
 * What the picture is while Appearance is empty: a hero's older "Image shape", a team portrait's
 * square corners (the card rounds them), otherwise Standard. The picker shows this as chosen.
 */
export function defaultAppearance(context: PresetOptionsContext): ImageAppearance {
  const section = sectionOf(context)
  if (section?._type === 'hero') return appearanceFromHeroShape(section.imageShape)
  return section?._type === 'team' ? 'square' : 'standard'
}

const designOf = (parent: unknown) => (parent ?? {}) as ImageDesignShape

const hiddenUnless =
  (
    applies: (design: ReturnType<typeof imageDesignUses>, parent: ImageDesignShape) => boolean,
  ): ConditionalPropertyCallback =>
  ({ parent }) => {
    const design = designOf(parent)
    return !applies(imageDesignUses(design), design)
  }

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ title: titles[value], value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

export const imageDesign = defineType({
  name: 'imageDesign',
  title: 'Image design',
  type: 'object',
  // The three pictures sit straight in the Design tab, not in a box of their own.
  options: { frameless: true },
  fieldsets: [
    {
      name: 'more',
      title: 'More image options',
      description: 'Fine-tune the chosen motion and frame. Only the options they use are shown.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    {
      ...presetField({
        name: 'appearance',
        title: 'Image shape',
        description: 'How the picture is cut. Framed adds a decorative frame that stays still.',
        required: false,
        options: IMAGE_APPEARANCES.map((value) => ({
          value,
          title: IMAGE_APPEARANCE_TITLES[value],
          description: {
            standard: 'The site’s own corners.',
            rounded: 'Soft, generous corners.',
            square: 'Sharp corners.',
            circle: 'Always square, cut to a circle.',
            arch: 'A tall picture with a rounded top.',
            framed: 'A decorative frame over the picture.',
          }[value],
          thumbnail: imageAppearanceThumbnails[value],
        })),
        // Square corners are offered where a section already had them, and they stay visible if stored.
        visibleOptions: (context) =>
          IMAGE_APPEARANCES.filter(
            (value) => value !== 'square' || defaultAppearance(context) === 'square',
          ),
        defaultValue: defaultAppearance,
      }),
      // Left empty until an editor chooses, so each section keeps its own look.
      initialValue: undefined,
    },
    {
      ...presetField({
        name: 'motion',
        title: 'Picture motion',
        description:
          'The picture drifts gently inside its still frame as the page scrolls. Visitors who prefer less motion see it still.',
        required: false,
        options: IMAGE_MOTIONS.map((value) => ({
          value,
          title: IMAGE_MOTION_TITLES[value],
          description: {
            none: 'The picture stays put.',
            subtle: 'A slow, quiet drift.',
            medium: 'A clearer drift.',
          }[value],
          thumbnail: imageMotionThumbnails[value],
        })),
        defaultValue: () => 'none',
      }),
      initialValue: undefined,
    },
    {
      ...presetField({
        name: 'frame',
        title: 'Frame',
        description: 'Drawn over the picture and kept still while the picture moves behind it.',
        required: false,
        options: IMAGE_FRAMES.map((value) => ({
          value,
          title: IMAGE_FRAME_TITLES[value],
          thumbnail: imageFrameThumbnails[value],
        })),
        hidden: ({ parent }) => !showsFrame(designOf(parent).appearance ?? undefined),
        defaultValue: () => 'thin-line',
      }),
      initialValue: undefined,
    },
    defineField({
      name: 'customFrame',
      title: 'Approved frame',
      type: 'reference',
      to: [{ type: 'frame' }],
      description: 'Frames are added by the agency, under Design > Image frames.',
      hidden: ({ parent }) => {
        const design = designOf(parent)
        return !showsFrame(design.appearance ?? undefined) || design.frame !== 'custom'
      },
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          designOf(parent).frame === 'custom' &&
          showsFrame(designOf(parent).appearance ?? undefined) &&
          !value
            ? 'Choose an approved frame, or a different frame style'
            : true,
        ),
    }),
    defineField({
      name: 'custom',
      title: 'Set exact motion values',
      type: 'boolean',
      fieldset: 'more',
      description: 'Choose the distance, direction and scale yourself.',
      initialValue: false,
      hidden: hiddenUnless((uses) => uses.custom),
    }),
    defineField({
      name: 'travel',
      title: 'Travel distance',
      type: 'number',
      fieldset: 'more',
      description: `How far the picture moves each way, as a percentage of its height (${TRAVEL_MIN * 100} to ${TRAVEL_MAX * 100}). Phones get half.`,
      hidden: hiddenUnless((uses) => uses.travel),
      validation: (rule) => rule.min(TRAVEL_MIN * 100).max(TRAVEL_MAX * 100),
    }),
    defineField({
      name: 'direction',
      title: 'Direction',
      type: 'string',
      fieldset: 'more',
      options: radio(IMAGE_DIRECTIONS, IMAGE_DIRECTION_TITLES),
      hidden: hiddenUnless((uses) => uses.direction),
    }),
    defineField({
      name: 'scale',
      title: 'Picture scale',
      type: 'number',
      fieldset: 'more',
      description: `How much larger than its frame the picture is drawn (${SCALE_MIN} to ${SCALE_MAX}). Leave empty to use just enough for the travel.`,
      hidden: hiddenUnless((uses) => uses.scale),
      validation: (rule) => rule.min(SCALE_MIN).max(SCALE_MAX),
    }),
    defineField({
      name: 'frameColour',
      title: 'Frame colour',
      type: 'string',
      fieldset: 'more',
      description: 'A colour from the site’s design. Accent if empty.',
      options: radio(IMAGE_FRAME_COLOURS, IMAGE_FRAME_COLOUR_TITLES),
      hidden: hiddenUnless((uses) => uses.frameColour),
    }),
    defineField({
      name: 'frameInset',
      title: 'Frame inset',
      type: 'number',
      fieldset: 'more',
      description: `How far the frame sits in from the picture’s edge, as a percentage (${FRAME_INSET.min} to ${FRAME_INSET.max}). For the offset border, how far it sticks out.`,
      hidden: hiddenUnless((uses) => uses.frameInset),
      validation: (rule) => rule.min(FRAME_INSET.min).max(FRAME_INSET.max),
    }),
  ],
})

/**
 * The field a section adds for its picture's design: in the agency-only Design tab, with the section's
 * other design options. `hidden` adds a rule of the section's own (the gallery's Masonry layout keeps
 * every picture's own shape, so it has none).
 */
export function imageDesignField({ hidden }: { hidden?: ConditionalPropertyCallback } = {}) {
  return defineField({
    name: 'imageDesign',
    title: 'Image design',
    type: 'imageDesign',
    group: 'design',
    hidden: (context) => hiddenFromClients(context) || (hidden ? hidden(context) : false),
  })
}
