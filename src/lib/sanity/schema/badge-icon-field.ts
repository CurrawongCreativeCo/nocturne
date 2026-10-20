import { defineField, type ConditionalProperty } from 'sanity'

import { BADGE_ICONS } from '../badge-icons'

declare module 'sanity' {
  interface StringOptions {
    /** Show the options as a grid of the icons themselves (features/studio/components/icon-picker-input). */
    iconPicker?: boolean
  }
}

/**
 * An optional icon from the shared set (lib/sanity/badge-icons.ts): a Link list link's, a decorative
 * divider's middle, a badge's. The Studio shows each icon drawn above its name, with "No icon" first;
 * the stored value is the icon's name, as before, so saved choices keep working. Without the picker
 * input the field is the plain list.
 */
export function badgeIconField({
  name = 'icon',
  title = 'Icon',
  description,
  hidden,
}: {
  name?: string
  title?: string
  description?: string
  hidden?: ConditionalProperty
} = {}) {
  return defineField({
    name,
    title,
    type: 'string',
    description,
    hidden,
    options: {
      list: BADGE_ICONS.map(({ value, title: label }) => ({ value, title: label })),
      layout: 'dropdown',
      iconPicker: true,
    },
  })
}
