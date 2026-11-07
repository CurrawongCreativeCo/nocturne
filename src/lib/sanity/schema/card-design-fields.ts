import {
  defineField,
  type ConditionalProperty,
  type ConditionalPropertyCallback,
  type FieldDefinition,
} from 'sanity'

import { BODY_TEXT_RATIO } from '@/lib/color/background-contrast'
import {
  worstCardTextContrast,
  type RoleDefaultColours,
  type StoredCardLevel,
} from '@/lib/color/card-contrast'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import type { TextRole } from '@/lib/design/capabilities'
import { cardFamilySummary } from '@/lib/sanity/card-design-summary'
import { scopedGroupTitle } from '@/lib/sanity/design-summary'
import { hiddenFromClients } from '@/lib/sanity/roles'
import { fetchBrandColours } from '@/lib/sanity/schema/brand-colours'
import { itemAppearanceField, notCustomised } from '@/lib/sanity/schema/item-appearance'
import { presetsOption, type PresetDefinition } from '@/lib/sanity/schema/preset-field'
import { enclosingOfArray, memberOfArray } from '@/lib/sanity/schema/schema-path'
import { sectionAtStylePath } from '@/lib/sanity/schema/section-form'
import {
  iconDesignFields,
  surfaceFields,
  textRoleField,
  textRoleParts,
} from '@/lib/sanity/schema/surface-design'

/**
 * The shared forms of a card family's design (task 156): the section header's eyebrow and Design box, the
 * Cards box at section level and the same fields behind an Appearance switch at item level. Every field is
 * built by a shared builder (surfaceFields, textRoleField, itemAppearanceField, the decorativeMark type), so
 * a family composes them and never writes a design control of its own. The family says which roles it
 * draws; the renderer must draw each one it lists (the capability evidence proves it).
 */

export interface CardRole {
  role: TextRole
  /** Offers highlighted words (short card text only). */
  highlight?: boolean
  /** Hides the role where the layout doesn't draw it. */
  hidden?: ConditionalProperty
}

const both =
  (...callbacks: (ConditionalProperty | undefined)[]): ConditionalPropertyCallback =>
  (context) =>
    callbacks.some((callback) =>
      typeof callback === 'function' ? callback(context) : callback === true,
    )

/** The optional eyebrow every section with a heading can have: no migration, empty draws nothing. */
export const eyebrowField = (max = 40) =>
  defineField({
    name: 'eyebrow',
    title: 'Eyebrow',
    type: 'string',
    description: 'A short line above the title. Optional.',
    validation: (rule) => rule.max(max).warning(),
  })

/**
 * The section header's three roles, agency only. `hidden` hides a role where the section doesn't draw it
 * as text (a Link list's heading shown as a wordmark picture).
 */
export const headerDesignField = (
  hidden: Partial<Record<'eyebrow' | 'heading' | 'intro', ConditionalPropertyCallback>> = {},
) =>
  defineField({
    name: 'headerDesign',
    title: scopedGroupTitle('Section header', 'section'),
    type: 'object',
    group: 'design',
    description: 'The eyebrow, title and intro. Inherit uses the section’s own.',
    hidden: hiddenFromClients,
    options: { collapsible: true, collapsed: true },
    fields: (['eyebrow', 'heading', 'intro'] as const).map((role) =>
      textRoleField({
        role,
        inherits: 'the section’s own',
        capability: 'header',
        hidden: hidden[role],
      }),
    ),
  })

/**
 * The Icons box (task 158): the container, fill, strength, border and colour of the section's set icons.
 * Agency only. `own` is the shape each icon has with nothing chosen (plain: no container), so the fill and
 * border are only offered once there is one. `hidden` hides it where the layout draws no icons.
 */
export const iconsDesignField = ({
  hidden,
  inherits = 'the default (no container)',
  scope = 'card',
  group = 'design',
}: {
  hidden?: ConditionalPropertyCallback
  inherits?: string
  scope?: 'card' | 'section'
  /** The field group; none for a block with no groups. */
  group?: string | null
} = {}) =>
  defineField({
    name: 'iconDesign',
    title: scopedGroupTitle('Icons', scope),
    type: 'object',
    ...(group ? { group } : {}),
    description:
      'The container and colour of the icons chosen from the set. Uploaded icons and images are always drawn whole.',
    hidden: both(hiddenFromClients, hidden),
    options: { collapsible: true, collapsed: true },
    fields: iconDesignFields({
      inherits,
      shapeOf: (context) =>
        (context.parent as { iconShape?: string } | undefined)?.iconShape ?? 'plain',
    }),
  })

/** A Background warning's options, for a family with glass or wording of its own (the Link list). */
export interface CardContrastWarning {
  /** The roles to measure. Default: every role. */
  roles?: readonly TextRole[]
  /** The strength of the glass behind the text, for a family that draws some. */
  glassOf?: (section: never) => GlassStrength | null
  /** The warning's words. Default: "Text may be hard to read on this background". */
  message?: (ratio: string, onGlass: boolean) => string
}

interface CardFieldsConfig {
  /** What Inherit means here: "the default card", "the section’s card design". */
  inherits: string
  inItem?: boolean
  roles: readonly CardRole[]
  /** The fill and border, hidden where the layout draws no surface. Off for a family with none. */
  surface?: { hidden?: ConditionalPropertyCallback } | false
  /** A decorative mark at this level. */
  mark?: boolean
  /** Hides the mark where the layout draws no card to hold it. */
  markHidden?: ConditionalPropertyCallback
  /** What each role is drawn in until one is chosen, for the background's contrast warning. */
  defaults?: RoleDefaultColours
  /** The array an item's design sits in, for the item-level contrast warning. */
  itemArray?: string
  /** How a family words and measures the warning, when its own differs. */
  contrast?: CardContrastWarning
  /** Hides every field (an item's, until it is customised). */
  hidden?: ConditionalPropertyCallback
}

/**
 * The warning on a Background colour (task 156): the worst of the card's text on the background it draws,
 * chosen text colours included, with the site's Brand colours. A warning, never an error.
 */
export function withCardTextContrast<T extends FieldDefinition>(
  field: T,
  {
    defaults = {},
    itemArray,
    contrast = {},
  }: Pick<CardFieldsConfig, 'defaults' | 'itemArray' | 'contrast'>,
): T {
  if (field.name !== 'background') return field
  return {
    ...field,
    validation: (rule: { custom: (fn: unknown) => { warning: () => unknown } }) =>
      rule
        .custom(
          async (
            _value: unknown,
            context: {
              document?: unknown
              path?: unknown
              getClient: (options: { apiVersion: string }) => never
            },
          ) => {
            type Level = StoredCardLevel & { appearance?: string }
            const path = context.path as never
            const section = (
              itemArray
                ? enclosingOfArray(context.document, path, itemArray)
                : sectionAtStylePath(context.document, path)
            ) as { cardDesign?: Level; style?: { tone?: string } } | undefined
            const member = itemArray
              ? (memberOfArray(context.document, path, itemArray) as { design?: Level } | undefined)
              : undefined
            const own = member?.design?.appearance === 'custom' ? member.design : undefined
            const { colours } = await fetchBrandColours(
              context.getClient({ apiVersion: '2025-01-01' }),
            )
            const glass = contrast.glassOf?.(section as never) ?? null
            const worst = worstCardTextContrast({
              levels: [section?.cardDesign, own],
              defaults,
              roles: contrast.roles,
              tone: section?.style?.tone,
              glass,
              site: colours,
            })
            if (!worst || worst.ratio >= BODY_TEXT_RATIO) return true
            if (contrast.message) return contrast.message(worst.ratio.toFixed(1), glass !== null)
            return `Text may be hard to read on this background: ${worst.ratio.toFixed(1)}:1 (text needs ${String(BODY_TEXT_RATIO)}:1). Choose a stronger or different colour, or change the text colours under Text.`
          },
        )
        .warning(),
  }
}

/** The fields of a card's design: fill and border, one object per role, a mark. */
export function cardDesignFields(config: CardFieldsConfig): FieldDefinition[] {
  const { inherits, inItem, roles, surface = {}, mark = true, markHidden, hidden } = config
  return [
    ...(surface === false
      ? []
      : surfaceFields({
          inherits,
          inItem,
          hidden: both(hidden, surface.hidden),
        }).map((field) => withCardTextContrast(field, config))),
    ...roles.map(({ role, highlight, hidden: roleHidden }) =>
      textRoleField({
        role,
        inherits,
        inItem,
        fieldset: 'text',
        highlight,
        hidden: both(hidden, roleHidden),
      }),
    ),
    ...(mark
      ? [
          defineField({
            name: 'mark',
            title: 'Decorative mark',
            type: 'decorativeMark',
            description: inItem
              ? 'One faint mark behind this card’s text, instead of the section’s card mark.'
              : 'One faint mark behind each card’s text.',
            hidden: both(hidden, markHidden),
          }),
        ]
      : []),
  ]
}

const textFieldset = (description?: string) => ({
  name: 'text',
  title: 'Text',
  ...(description ? { description } : {}),
  options: { collapsible: true, collapsed: true },
})

/** A family's Cards box, agency only, at section level. */
export function cardDesignField({
  title = scopedGroupTitle('Cards', 'card'),
  description = 'Shared background, border, text and mark for every card. Inherit uses the default card.',
  presets,
  boxHidden,
  lead = [],
  textDescription,
  ...config
}: Omit<CardFieldsConfig, 'inItem' | 'hidden'> & {
  title?: string
  description?: string
  presets?: readonly PresetDefinition[]
  /** Hides the whole box where the layout draws nothing it could change. Its `parent` is the section. */
  boxHidden?: ConditionalPropertyCallback
  /** Fields that come first in the box (an item style, which decides what the rest apply to). */
  lead?: readonly FieldDefinition[]
  /** The line under the Text group's title. */
  textDescription?: string
}) {
  return defineField({
    name: 'cardDesign',
    title,
    type: 'object',
    group: 'design',
    description,
    hidden: both(hiddenFromClients, boxHidden),
    options: {
      collapsible: true,
      collapsed: false,
      ...(presets ? presetsOption(presets) : {}),
    },
    fieldsets: [textFieldset(textDescription)],
    fields: [...lead, ...cardDesignFields(config)],
  })
}

/**
 * One item's Appearance (a pricing plan's), agency only: the same fields as the Cards box behind the
 * shared Customise switch, with the design summary above them. Inherit uses the section's Cards box.
 */
export function itemDesignField({
  noun,
  ...config
}: Omit<CardFieldsConfig, 'inItem' | 'hidden' | 'inherits'> & {
  /** What an item is called in a sentence: "plan". */
  noun: string
}) {
  return defineField({
    name: 'design',
    title: 'Appearance',
    type: 'object',
    description: `This ${noun} follows the section’s card design (Design tab). Customise it to change only what you pick here.`,
    hidden: hiddenFromClients,
    options: {
      collapsible: true,
      collapsed: true,
      designSummary: cardFamilySummary({
        noun,
        roles: config.roles.map(({ role }) => role),
        rolePartsOf: textRoleParts,
        mark: config.mark ?? true,
      }),
    },
    fieldsets: [textFieldset()],
    fields: [
      itemAppearanceField({ inheritLabel: 'Use the section’s card design' }),
      ...cardDesignFields({
        ...config,
        inherits: 'the section’s card design',
        inItem: true,
        hidden: notCustomised,
      }),
    ],
  })
}
