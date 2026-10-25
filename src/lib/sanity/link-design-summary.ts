import { joinSubtitle } from './schema/section-variant'
import { themeColourCss } from './theme-colour'

/**
 * Reading a Link list link's design at a glance (README, "Link list": Reading a link's design). A
 * link either uses the list's design or is customised, and a customised link changes only the
 * properties its Appearance sets (design-overrides.ts). These pure functions name what a link
 * changes, at which level, and which stored keys a reset must clear, for the link's preview, the top
 * of its Appearance and the section's preview. Nothing here changes how a card is drawn.
 */

/** The groups of a link's Appearance, in the order the form shows them. */
export const LINK_DESIGN_GROUPS = ['card', 'text', 'icon', 'arrow'] as const
export type LinkDesignGroup = (typeof LINK_DESIGN_GROUPS)[number]

export const LINK_DESIGN_GROUP_TITLES: Record<LinkDesignGroup, string> = {
  card: 'Card',
  text: 'Text',
  icon: 'Icon',
  arrow: 'Arrow',
}

/** At which level a group of design controls applies. */
export const LINK_DESIGN_SCOPES = {
  link: 'This link only',
  list: 'All links in this list',
} as const

/** A group heading with its scope: "Card · This link only". */
export const scopedTitle = (title: string, scope: keyof typeof LINK_DESIGN_SCOPES) =>
  joinSubtitle(title, LINK_DESIGN_SCOPES[scope])

/**
 * A stored key of a link's Appearance, as editors name it. `key` is the field on the link's design
 * object; `part` is the property inside it for text (`label.colour`) and unset for the rest.
 */
interface DesignProperty {
  group: LinkDesignGroup
  key: string
  part?: string
  /** Lower case, as it reads inside a sentence: "label colour". */
  label: string
}

const TEXT_PARTS = {
  size: 'size',
  weight: 'weight',
  colour: 'colour',
  textCase: 'letters',
  tracking: 'letter spacing',
  leading: 'line height',
} as const

const textProperties = (
  key: 'eyebrow' | 'label' | 'description',
  parts: (keyof typeof TEXT_PARTS)[],
) =>
  parts.map((part): DesignProperty => ({
    group: 'text',
    key,
    part,
    label: `${key} ${TEXT_PARTS[part]}`,
  }))

/** Every property a link's Appearance can set, in form order. Keep equal to the fields in link-list.ts. */
export const LINK_DESIGN_PROPERTIES: readonly DesignProperty[] = [
  { group: 'card', key: 'background', label: 'background colour' },
  { group: 'card', key: 'backgroundStrength', label: 'background strength' },
  { group: 'card', key: 'border', label: 'border' },
  { group: 'card', key: 'borderColour', label: 'border colour' },
  { group: 'card', key: 'shadow', label: 'shadow' },
  ...textProperties('eyebrow', ['size', 'weight', 'colour', 'textCase', 'tracking']),
  ...textProperties('label', ['size', 'weight', 'colour']),
  ...textProperties('description', ['size', 'weight', 'colour', 'leading']),
  { group: 'icon', key: 'iconShape', label: 'icon container' },
  { group: 'icon', key: 'iconColour', label: 'icon colour' },
  { group: 'icon', key: 'iconBackground', label: 'container colour' },
  { group: 'icon', key: 'iconBackgroundStrength', label: 'container strength' },
  { group: 'icon', key: 'iconBorder', label: 'container border' },
  { group: 'icon', key: 'iconBorderColour', label: 'container border colour' },
  { group: 'arrow', key: 'arrowStyle', label: 'arrow style' },
  { group: 'arrow', key: 'arrowColour', label: 'arrow colour' },
]

/** The stored keys of a group, for a reset that clears only that group. */
export const keysOfGroup = (group: LinkDesignGroup): string[] => [
  ...new Set(LINK_DESIGN_PROPERTIES.filter((p) => p.group === group).map((p) => p.key)),
]

/**
 * Whether a stored value is a choice. Only an unset value inherits: a border of "none", a
 * transparent background, `0` and `false` are choices (design-overrides.ts). A colour is stored as
 * `{ colour, hex }` and counts only when the page draws it (`themeColourCss`): an empty or
 * "inherit" colour, or a Custom without a valid hex, inherits.
 */
export function isChosen(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'object') return themeColourCss(value) !== undefined
  return true
}

type StoredDesign = Record<string, unknown> | null | undefined

function valueOf(design: StoredDesign, property: DesignProperty): unknown {
  const stored = design?.[property.key]
  if (property.part === undefined) return stored
  return stored && typeof stored === 'object'
    ? (stored as Record<string, unknown>)[property.part]
    : undefined
}

/** The properties a link's Appearance holds a choice for, whether or not it is switched on. */
export function chosenProperties(design: StoredDesign): DesignProperty[] {
  return LINK_DESIGN_PROPERTIES.filter((property) => isChosen(valueOf(design, property)))
}

export interface LinkDesignSummary {
  /** `list`: the page follows the Link list design. `custom`: the link's choices apply. */
  state: 'list' | 'custom'
  /** How many properties this link changes (0 while it follows the list). */
  changes: number
  /** Choices saved on a link that follows the list: kept, but not applied. */
  kept: number
  /** Names of what changes, in form order. */
  labels: string[]
  /** "Uses the Link list design" or "Customised · 2 changes". */
  text: string
  /** The same with what changes: "Customised · 2 changes (label colour, container strength)". */
  detail: string
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${String(count)} ${count === 1 ? one : many}`

/** The short names for a sentence: the first few, then "and 2 more". */
export function listLabels(labels: readonly string[], max = 3): string {
  if (labels.length <= max) return labels.join(', ')
  return `${labels.slice(0, max).join(', ')} and ${String(labels.length - max)} more`
}

/** What a link's design says, for its preview and the top of its Appearance. */
export function summariseLinkDesign(design: StoredDesign, maxLabels = 3): LinkDesignSummary {
  const chosen = chosenProperties(design)
  if (design?.appearance !== 'custom') {
    return {
      state: 'list',
      changes: 0,
      kept: chosen.length,
      labels: [],
      text: 'Uses the Link list design',
      detail:
        chosen.length > 0
          ? `Uses the Link list design (${plural(chosen.length, 'saved change')} not applied)`
          : 'Uses the Link list design',
    }
  }
  const labels = chosen.map((property) => property.label)
  const text =
    labels.length === 0
      ? 'Customised · no changes yet'
      : `Customised · ${plural(labels.length, 'change')}`
  return {
    state: 'custom',
    changes: labels.length,
    kept: 0,
    labels,
    text,
    detail: labels.length === 0 ? text : `${text} (${listLabels(labels, maxLabels)})`,
  }
}

/** How many of a list's links change the list's design. A link set to customise with no change does not. */
export function countCustomisedLinks(
  links: readonly ({ design?: StoredDesign } | null | undefined)[] | null | undefined,
): number {
  return (links ?? []).filter((link) => summariseLinkDesign(link?.design).changes > 0).length
}

/** "2 links customised", or nothing when none are. */
export function customisedLinksText(count: number): string | undefined {
  return count > 0 ? `${plural(count, 'link')} customised` : undefined
}

/**
 * The stored keys a reset clears. A group clears its own keys that hold anything, never another
 * group's, and never `appearance`. Hidden values count: a reset removes what is saved, not only
 * what shows.
 */
export function resetKeys(design: StoredDesign, group: LinkDesignGroup): string[] {
  return keysOfGroup(group).filter((key) => design?.[key] !== undefined)
}

/** How many properties a group changes now, for the group's reset button. */
export function groupChanges(design: StoredDesign, group: LinkDesignGroup): number {
  return chosenProperties(design).filter((property) => property.group === group).length
}
