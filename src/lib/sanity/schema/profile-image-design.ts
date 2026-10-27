import { defineField, type ConditionalPropertyCallback } from 'sanity'

import {
  BORDER_WIDTHS,
  BORDER_WIDTH_TITLES,
  PROFILE_BORDER_TITLES,
  PROFILE_IMAGE_SHAPE_TITLES,
  PROFILE_IMAGE_SIZES,
  PROFILE_IMAGE_SIZE_TITLES,
  type ProfileImageShape,
} from '../profile-image-options'
import { hiddenFromClients } from '../roles'
import { themeColourField } from './theme-colour'
import { validateVisible } from './validate-visible'

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ value, title: titles[value] })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

const RINGS = ['none', 'line'] as const

/**
 * The design of a small portrait drawn by `ProfileImage` (components/ui/profile-image.tsx): the
 * Team list's portraits and the testimonial avatars. A size, optionally a shape, and an optional
 * solid ring; the ring's thickness and colour show only once there is a ring. Agency only, like the
 * rest of Design, and empty is the picture as it always looked. Larger pictures use `imageDesignField`
 * instead, never both on one picture (README, "Image design").
 */
export function profileImageDesignField({
  name,
  title,
  description,
  shapes,
  hidden,
}: {
  name: string
  title: string
  description: string
  /** The shapes offered; without any, the component's own shape stays. */
  shapes?: readonly ProfileImageShape[]
  hidden?: ConditionalPropertyCallback
}) {
  const noRing: ConditionalPropertyCallback = ({ parent }) =>
    ((parent as { border?: string } | undefined)?.border ?? 'none') !== 'line'

  return validateVisible(
    defineField({
      name,
      title,
      type: 'object',
      group: 'design',
      description,
      hidden: (context) => hiddenFromClients(context) || (hidden ? hidden(context) : false),
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'imageSize',
          title: 'Picture size',
          type: 'string',
          description: 'Medium is the size it always was.',
          options: radio(PROFILE_IMAGE_SIZES, PROFILE_IMAGE_SIZE_TITLES),
        }),
        ...(shapes
          ? [
              defineField({
                name: 'imageShape',
                title: 'Picture shape',
                type: 'string',
                options: radio(shapes, PROFILE_IMAGE_SHAPE_TITLES),
              }),
            ]
          : []),
        defineField({
          name: 'border',
          title: 'Ring',
          type: 'string',
          description: 'A ring around the picture, with a small see-through gap.',
          options: radio(RINGS, PROFILE_BORDER_TITLES),
        }),
        defineField({
          name: 'borderWidth',
          title: 'Ring thickness',
          type: 'string',
          options: radio(BORDER_WIDTHS, BORDER_WIDTH_TITLES),
          hidden: noRing,
        }),
        themeColourField({
          name: 'borderColour',
          title: 'Ring colour',
          usage: 'graphic',
          inherits: 'Primary',
          choices: ['ink', 'accent', 'accent-2', 'highlight'],
          hidden: noRing,
        }),
      ],
    }),
  )
}
