import { defineField, defineType, type ConditionalPropertyCallback } from 'sanity'

import { TRAVEL_MAX, TRAVEL_MIN, SCALE_MAX, SCALE_MIN } from '@/components/motion/image-travel'

import {
  FRAME_INSET,
  IMAGE_APPEARANCES,
  IMAGE_ARCH_RATIOS,
  IMAGE_ARCH_RATIO_TITLES,
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
  chosenFrame,
  imageDesignUses,
  type ImageAppearance,
  type ImageDesignShape,
} from '../image-design-options'
import { hiddenFromClients } from '../roles'
import { builtOptions } from './capability-marker'
import { presetField, type PresetOptionsContext } from './preset-field'
import { sectionAtStylePath } from './section-form'
import {
  imageAppearanceThumbnails,
  imageFrameThumbnails,
  imageMotionThumbnails,
} from './thumbnails/registry'
import { validateVisible } from './validate-visible'

/**
 * The shared `imageDesign` object: how a section's picture looks and moves (README, "Image design").
 * Three pictures to choose from, then a collapsed "Advanced: image" for the exact values:
 *
 *   Appearance  Standard, Rounded, Circle or Arch (Square corners where a section already had it; the
 *               older Framed only where it is stored)
 *   Motion      None, Subtle parallax or Medium parallax; the exact values are Custom, in Advanced
 *   Frame       None, Simple line, a built-in frame or an approved custom one, on any shape (task 177)
 *
 * Shape and frame are separate choices: changing one keeps the other and every picture's position.
 * The frame is `frameStyle`. The older `frame` stays stored and counts only beside the older Framed
 * appearance (`chosenFrame`), so content saved before keeps its look.
 *
 * FramedImage (components/ui/framed-image.tsx) draws it. Add it with `imageDesignField()` only where
 * the effect makes sense (a section's main pictures), never on logos, icons or small avatars. Agency
 * only, like the rest of Design; leave it empty and the picture looks as it always did.
 */

/** The values stored beside the object, which tell what the section would draw without a choice. */
interface Section {
  _type?: string
  imageShape?: string
  imageDesign?: ImageDesignShape
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

/** The first Arch ratio choice: it unsets the field (4:5). */
export const ARCH_DEFAULT_CHOICE = 'Use default (4:5)'
/** Allow frame overlap's clear button: it unsets the field, so the layout keeps the frame's room. */
export const OVERLAP_DEFAULT_CHOICE = 'Use default (keep room)'

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ title: titles[value], value })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

export const imageDesign = defineType({
  name: 'imageDesign',
  title: 'Image design',
  type: 'object',
  // The three pictures sit straight in the Design tab, not in a box of their own. A shared design
  // type, though none of its settings is one of the capabilities (lib/design/capabilities.ts).
  options: builtOptions('imageDesign', { frameless: true }),
  fieldsets: [
    {
      name: 'more',
      title: 'Advanced: image',
      description:
        'Fine-tune the chosen motion, arch and frame. Only the options they use are shown.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    {
      ...presetField({
        name: 'appearance',
        title: 'Image shape',
        description: 'How the picture is cut. A frame is chosen separately, below.',
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
            framed:
              'Older choice: Standard corners with its frame. Choose a shape and a frame instead.',
          }[value],
          thumbnail: imageAppearanceThumbnails[value],
        })),
        // Square corners are offered where a section already had them, and they stay visible if stored.
        // Framed is no longer offered: shape and frame are separate. It stays visible where it is stored.
        visibleOptions: (context) =>
          IMAGE_APPEARANCES.filter((value) => {
            if (value === 'square') return defaultAppearance(context) === 'square'
            if (value === 'framed') return sectionOf(context)?.imageDesign?.appearance === 'framed'
            return true
          }),
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
        name: 'frameStyle',
        title: 'Frame',
        description:
          'Drawn around the picture and kept still while the picture moves behind it. Changing it keeps the shape and every picture’s position.',
        required: false,
        options: IMAGE_FRAMES.map((value) => ({
          value,
          title: IMAGE_FRAME_TITLES[value],
          thumbnail: imageFrameThumbnails[value],
        })),
        // Empty, it shows what is drawn: the older Framed's own frame, otherwise none.
        defaultValue: (context) => chosenFrame(sectionOf(context)?.imageDesign),
      }),
      initialValue: undefined,
    },
    {
      // The older frame: stored, read only beside the older Framed appearance (`chosenFrame`).
      ...presetField({
        name: 'frame',
        title: 'Frame (older)',
        required: false,
        options: IMAGE_FRAMES.map((value) => ({
          value,
          title: IMAGE_FRAME_TITLES[value],
          thumbnail: imageFrameThumbnails[value],
        })),
        hidden: () => true,
        defaultValue: () => 'thin-line',
      }),
      initialValue: undefined,
    },
    defineField({
      name: 'customFrame',
      title: 'Approved frame',
      type: 'reference',
      to: [{ type: 'frame' }],
      options: { disableNew: true },
      description: 'Frames are added by the agency, under Design > Image frames.',
      hidden: ({ parent }) => chosenFrame(designOf(parent)) !== 'custom',
      validation: (rule) =>
        rule.custom((value, { parent }) =>
          chosenFrame(designOf(parent)) === 'custom' && !value
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
      name: 'archRatio',
      title: 'Arch ratio',
      type: 'string',
      fieldset: 'more',
      description: 'Width to height.',
      // The first choice clears the field, so the arch goes back to 4:5 without storing a value of its own.
      options: {
        ...radio(IMAGE_ARCH_RATIOS, IMAGE_ARCH_RATIO_TITLES),
        inheritable: ARCH_DEFAULT_CHOICE,
      },
      hidden: hiddenUnless((uses) => uses.archRatio),
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
    defineField({
      name: 'frameOverlap',
      title: 'Allow frame overlap',
      type: 'boolean',
      fieldset: 'more',
      description:
        'Off: the layout keeps room for the part of the frame outside the picture, so it never runs into the space around it. On: the frame may overlap the gap or whatever is next to the picture.',
      // A switch stores false when turned off; the button removes the value, so the default (keep room) applies.
      options: { clearable: OVERLAP_DEFAULT_CHOICE },
      hidden: hiddenUnless((uses) => uses.frameOverlap),
    }),
  ].map(validateVisible),
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
