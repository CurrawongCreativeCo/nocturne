import { defineField, type ConditionalProperty, type ConditionalPropertyCallback } from 'sanity'

import {
  INLINE_CASE_TITLES,
  INLINE_SIZE_TITLES,
  INLINE_WEIGHT_TITLES,
} from '../inline-list-options'
import {
  BORDER_COLOUR_CHOICES,
  ICON_COLOUR_CHOICES,
  ICON_SHAPES,
  ICON_SHAPE_TITLES,
  SURFACE_BORDERS,
  SURFACE_BORDER_TITLES,
  SURFACE_COLOUR_CHOICES,
  SURFACE_STRENGTHS,
  SURFACE_STRENGTH_TITLES,
} from '../surface-options'
import {
  TEXT_CASES,
  TEXT_COLOUR_CHOICES,
  TEXT_LEADINGS,
  TEXT_LEADING_TITLES,
  TEXT_SIZES,
  TEXT_TRACKINGS,
  TEXT_TRACKING_TITLES,
  TEXT_WEIGHTS,
} from '../text-style-options'
import { themeColourField } from './theme-colour'

declare module 'sanity' {
  interface StringOptions {
    /**
     * An optional design choice that inherits while unset: the Studio draws the options as buttons
     * after an "Inherit" one that clears the value (features/studio/components/inheritable-choice-input).
     * A string names that first button instead ("Use the Link list design").
     */
    inheritable?: boolean | string
  }
  interface ObjectOptions {
    /**
     * A link's Appearance: the Studio shows what the link changes and the resets above its fields
     * (features/studio/components/link-design-summary-input).
     */
    linkDesignSummary?: boolean
  }
}

/**
 * The fields of a surface, an element's text and an icon's container (lib/sanity/surface-options.ts,
 * text-style-options.ts), for a section's design and for one item's overrides alike: the same names
 * at both levels, so they layer (design-overrides.ts). Every field is optional and starts on Inherit;
 * `inherits` says what that means at this level ("the layout’s own", "the Link list’s").
 */

interface Level {
  /** What Inherit uses here, e.g. "the layout’s own". */
  inherits: string
  /** The fields sit inside one of the section's items (a link), not on the section. */
  inItem?: boolean
}

/** An optional choice with an Inherit button first (stores nothing until another is chosen). */
export function choiceField<T extends string>({
  name,
  title,
  description,
  values,
  titles,
  inherits,
  fieldset,
  hidden,
}: {
  name: string
  title: string
  description?: string
  values: readonly T[]
  titles: Record<T, string>
  inherits: string
  fieldset?: string
  hidden?: ConditionalProperty
}) {
  return defineField({
    name,
    title,
    type: 'string',
    description: [description, `Inherit uses ${inherits}.`].filter(Boolean).join(' '),
    fieldset,
    hidden,
    options: {
      list: values.map((value) => ({ value, title: titles[value] })),
      layout: 'radio',
      direction: 'horizontal',
      inheritable: true,
    },
  })
}

const valueOf = (parent: unknown, name: string) =>
  (parent as Record<string, unknown> | undefined)?.[name]

/** A card's fill and border. `isGlass` hides what glass ignores and words the strength for it. */
export function surfaceFields({
  inherits,
  inItem,
  fieldset,
  hidden,
}: Level & { fieldset?: string; hidden?: ConditionalPropertyCallback }) {
  const hiddenOr =
    (own?: ConditionalPropertyCallback): ConditionalPropertyCallback =>
    (context) =>
      (hidden?.(context) ?? false) || (own?.(context) ?? false)
  return [
    themeColourField({
      name: 'background',
      title: 'Background colour',
      description: `Glass is tinted, not filled: the blur stays. Transparent leaves only the glass (or nothing on a solid card). Inherit uses ${inherits}.`,
      usage: 'graphic',
      choices: SURFACE_COLOUR_CHOICES,
      onCard: 'background',
      inItem,
      inherits,
      fieldset,
      hidden: hiddenOr(),
    }),
    choiceField({
      name: 'backgroundStrength',
      title: 'Background strength',
      description:
        'How much of the colour shows. Light, Medium and Strong keep glass see-through; Solid hides the photo.',
      values: SURFACE_STRENGTHS,
      titles: SURFACE_STRENGTH_TITLES,
      inherits: `${inherits} (the glass strength on Glass rows, else Solid)`,
      fieldset,
      hidden: hiddenOr(
        ({ parent }) =>
          (valueOf(parent, 'background') as { colour?: string } | undefined)?.colour ===
          'transparent',
      ),
    }),
    choiceField({
      name: 'border',
      title: 'Border',
      description: 'None removes it.',
      values: SURFACE_BORDERS,
      titles: SURFACE_BORDER_TITLES,
      inherits,
      fieldset,
      hidden: hiddenOr(),
    }),
    themeColourField({
      name: 'borderColour',
      title: 'Border colour',
      usage: 'graphic',
      choices: BORDER_COLOUR_CHOICES,
      inItem,
      inherits,
      fieldset,
      hidden: hiddenOr(({ parent }) => valueOf(parent, 'border') === 'none'),
    }),
  ]
}

type TextElement = 'eyebrow' | 'label' | 'description'

const TEXT_ELEMENT = {
  eyebrow: {
    title: 'Eyebrow',
    description: 'The small line above the label. Empty is small spaced capitals.',
  },
  label: { title: 'Label', description: 'Medium is the layout’s own size.' },
  description: { title: 'Description', description: 'Medium is the layout’s own size.' },
} as const

/** One text element's look: size, weight and colour, plus capitals and spacing (eyebrow) or line height (description). */
export function textStyleField({
  element,
  inherits,
  inItem,
  fieldset,
  hidden,
}: Level & { element: TextElement; fieldset?: string; hidden?: ConditionalProperty }) {
  const { title, description } = TEXT_ELEMENT[element]
  return defineField({
    name: element,
    title,
    type: 'object',
    description,
    fieldset,
    hidden,
    options: { collapsible: true, collapsed: true },
    fields: [
      choiceField({
        name: 'size',
        title: 'Size',
        values: TEXT_SIZES,
        titles: INLINE_SIZE_TITLES,
        inherits,
      }),
      choiceField({
        name: 'weight',
        title: 'Weight',
        values: TEXT_WEIGHTS,
        titles: INLINE_WEIGHT_TITLES,
        inherits,
      }),
      themeColourField({
        name: 'colour',
        title: 'Colour',
        usage: 'text',
        choices: TEXT_COLOUR_CHOICES,
        onCard: 'text',
        inItem,
        inherits,
      }),
      ...(element === 'eyebrow'
        ? [
            choiceField({
              name: 'textCase',
              title: 'Letters',
              values: TEXT_CASES,
              titles: INLINE_CASE_TITLES,
              inherits: `${inherits} (Capitals)`,
            }),
            choiceField({
              name: 'tracking',
              title: 'Letter spacing',
              description: 'Capitals are spaced a little unless you choose.',
              values: TEXT_TRACKINGS,
              titles: TEXT_TRACKING_TITLES,
              inherits,
            }),
          ]
        : []),
      ...(element === 'description'
        ? [
            choiceField({
              name: 'leading',
              title: 'Line height',
              values: TEXT_LEADINGS,
              titles: TEXT_LEADING_TITLES,
              inherits,
            }),
          ]
        : []),
    ],
  })
}

/**
 * An icon's container and colour. `shapeOf` is the shape that applies (the chosen one, else the one
 * inherited), so a container's fill and border are only offered when there is a container.
 */
export function iconDesignFields({
  inherits,
  inItem,
  fieldset,
  hidden,
  shapeOf,
}: Level & {
  fieldset?: string
  hidden?: ConditionalPropertyCallback
  shapeOf: (context: Parameters<ConditionalPropertyCallback>[0]) => string
}) {
  const hiddenOr =
    (own?: ConditionalPropertyCallback): ConditionalPropertyCallback =>
    (context) =>
      (hidden?.(context) ?? false) || (own?.(context) ?? false)
  const plain: ConditionalPropertyCallback = (context) => shapeOf(context) === 'plain'
  return [
    choiceField({
      name: 'iconShape',
      title: 'Icon container',
      description: 'A shape behind each icon, like the social icons’.',
      values: ICON_SHAPES,
      titles: ICON_SHAPE_TITLES,
      inherits,
      fieldset,
      hidden: hiddenOr(),
    }),
    themeColourField({
      name: 'iconColour',
      title: 'Icon colour',
      usage: 'graphic',
      onRows: true,
      choices: ICON_COLOUR_CHOICES,
      inItem,
      inherits,
      fieldset,
      hidden: hiddenOr(),
    }),
    themeColourField({
      name: 'iconBackground',
      title: 'Container colour',
      usage: 'graphic',
      choices: SURFACE_COLOUR_CHOICES,
      inItem,
      inherits,
      fieldset,
      hidden: hiddenOr(plain),
    }),
    choiceField({
      name: 'iconBackgroundStrength',
      title: 'Container strength',
      description: 'Light, Medium and Strong let the card show through.',
      values: SURFACE_STRENGTHS,
      titles: SURFACE_STRENGTH_TITLES,
      inherits: `${inherits} (Solid)`,
      fieldset,
      hidden: hiddenOr(
        (context) =>
          plain(context) ||
          (valueOf(context.parent, 'iconBackground') as { colour?: string } | undefined)?.colour ===
            'transparent',
      ),
    }),
    choiceField({
      name: 'iconBorder',
      title: 'Container border',
      description: 'None removes it.',
      values: SURFACE_BORDERS,
      titles: SURFACE_BORDER_TITLES,
      inherits,
      fieldset,
      hidden: hiddenOr(plain),
    }),
    themeColourField({
      name: 'iconBorderColour',
      title: 'Container border colour',
      usage: 'graphic',
      choices: BORDER_COLOUR_CHOICES,
      inItem,
      inherits,
      fieldset,
      hidden: hiddenOr(
        (context) => plain(context) || valueOf(context.parent, 'iconBorder') === 'none',
      ),
    }),
  ]
}
