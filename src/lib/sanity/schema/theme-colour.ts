import { defineField, type ConditionalProperty, type Path } from 'sanity'

import { HEX_PATTERN } from '@/lib/color/oklch'
import type { ColourUsage } from '@/lib/color/theme-colour-contrast'

import { THEME_COLOURS, THEME_COLOUR_TITLES, type ThemeColour } from '../theme-colour'

declare module 'sanity' {
  interface StringOptions {
    /**
     * The colour choice of a `themeColourField`: swatches of the theme's colours, with a contrast
     * check on the section's background (features/studio/components/theme-colour-picker).
     */
    themeColourPicker?: ColourUsage
    /** The Custom hex of a `themeColourField`: the Brand colours input, checked on the section's background. */
    themeColourHex?: ColourUsage
  }
}

/**
 * The section a colour field sits in, from its path: the deepest array member with a `_type` on the
 * way down (a page-builder section; the fields are never placed inside a link). The colour input
 * reads the section's tone through it, so the contrast check judges the background the page draws.
 */
export function sectionPathOf(path: Path): Path | null {
  for (let index = path.length - 1; index >= 0; index--) {
    const segment = path[index]
    if (segment && typeof segment === 'object' && !Array.isArray(segment) && '_key' in segment) {
      return path.slice(0, index + 1)
    }
  }
  return null
}

interface ThemeColourFieldConfig {
  name: string
  title: string
  description?: string
  /** The choices that make sense for this element; Inherit and Custom are always offered. */
  choices?: readonly Exclude<ThemeColour, 'inherit' | 'custom'>[]
  /** Text needs 4.5:1 on its background, icons and lines 3:1. */
  usage: ColourUsage
  /** What Inherit means here, e.g. "the text colour", so the editor knows what they get. */
  inherits: string
  fieldset?: string
  hidden?: ConditionalProperty
}

/**
 * One element's colour: the theme's Primary, Secondary or Highlight, a text colour, or a Custom hex
 * (only then is the hex field shown). Stored as `{ colour, hex }`; the site draws it with
 * `themeColourCss` (lib/sanity/theme-colour.ts) and ignores a value outside `choices`. Empty is
 * Inherit, so adding the field changes no existing page.
 */
export function themeColourField({
  name,
  title,
  description,
  choices = ['ink', 'muted', 'accent', 'accent-2', 'highlight'],
  usage,
  inherits,
  fieldset,
  hidden,
}: ThemeColourFieldConfig) {
  const offered: ThemeColour[] = ['inherit', ...choices, 'custom']
  return defineField({
    name,
    title,
    type: 'object',
    description: description ?? `Inherit uses ${inherits}.`,
    fieldset,
    hidden,
    options: { collapsible: false },
    fields: [
      defineField({
        name: 'colour',
        title: 'Colour',
        type: 'string',
        options: {
          themeColourPicker: usage,
          list: THEME_COLOURS.filter((value) => offered.includes(value)).map((value) => ({
            value,
            title: THEME_COLOUR_TITLES[value],
          })),
          layout: 'radio',
          direction: 'horizontal',
        },
      }),
      defineField({
        name: 'hex',
        title: 'Custom colour',
        type: 'string',
        description: 'Six-digit hex, e.g. #3266e4. Choose Inherit above to go back to the theme.',
        options: { themeColourHex: usage },
        hidden: ({ parent }: { parent?: { colour?: string } }) => parent?.colour !== 'custom',
        validation: (rule) =>
          rule.custom((value, { parent }) => {
            if ((parent as { colour?: string } | undefined)?.colour !== 'custom') return true
            return typeof value === 'string' && HEX_PATTERN.test(value)
              ? true
              : 'Choose a colour, as six-digit hex such as #3266e4. Until then the element keeps its own colour.'
          }),
      }),
    ],
  })
}
