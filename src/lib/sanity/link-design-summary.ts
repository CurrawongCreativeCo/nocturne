import {
  chosenDesignProperties,
  designGroupChanges,
  designResetKeys,
  isChosen,
  keysOfDesignGroup,
  listLabels,
  summariseDesign,
  type DesignProperty,
  type DesignSummaryConfig,
} from './design-summary'
import { joinSubtitle } from './schema/section-variant'

export { isChosen, listLabels }

/**
 * Reading a Link list link's design at a glance (README, "Link list": Reading a link's design). A
 * link either uses the list's design or is customised, and a customised link changes only the
 * properties its Appearance sets (design-overrides.ts). These pure functions name what a link
 * changes, at which level, and which stored keys a reset must clear, for the link's preview, the top
 * of its Appearance and the section's preview. Nothing here changes how a card is drawn.
 */

/** The groups of a link's Appearance, in the order the form shows them. */
export const LINK_DESIGN_GROUPS = ['card', 'text', 'icon', 'arrow', 'decoration'] as const
export type LinkDesignGroup = (typeof LINK_DESIGN_GROUPS)[number]

export const LINK_DESIGN_GROUP_TITLES: Record<LinkDesignGroup, string> = {
  card: 'Card',
  text: 'Text',
  icon: 'Icon',
  arrow: 'Arrow',
  decoration: 'Decoration',
}

/** At which level a group of design controls applies. */
export const LINK_DESIGN_SCOPES = {
  link: 'This link only',
  list: 'All links in this list',
} as const

/** A group heading with its scope: "Card · This link only". */
export const scopedTitle = (title: string, scope: keyof typeof LINK_DESIGN_SCOPES) =>
  joinSubtitle(title, LINK_DESIGN_SCOPES[scope])

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
  parts.map((part): LinkDesignProperty => ({
    group: 'text',
    key,
    part,
    label: `${key} ${TEXT_PARTS[part]}`,
  }))

/** A stored key of a link's Appearance, as editors name it (`group` is one of LINK_DESIGN_GROUPS). */
interface LinkDesignProperty extends DesignProperty {
  group: LinkDesignGroup
}

/** Every property a link's Appearance can set, in form order. Keep equal to the fields in link-list.ts. */
export const LINK_DESIGN_PROPERTIES: readonly LinkDesignProperty[] = [
  { group: 'card', key: 'background', label: 'background colour' },
  { group: 'card', key: 'backgroundStrength', label: 'background strength' },
  { group: 'card', key: 'border', label: 'border' },
  { group: 'card', key: 'borderColour', label: 'border colour' },
  { group: 'card', key: 'shadow', label: 'shadow' },
  ...textProperties('eyebrow', ['size', 'weight', 'colour', 'textCase', 'tracking']),
  ...textProperties('label', ['size', 'weight', 'colour', 'textCase', 'tracking']),
  ...textProperties('description', ['size', 'weight', 'colour', 'leading']),
  { group: 'icon', key: 'iconShape', label: 'icon container' },
  { group: 'icon', key: 'iconColour', label: 'icon colour' },
  { group: 'icon', key: 'iconBackground', label: 'container colour' },
  { group: 'icon', key: 'iconBackgroundStrength', label: 'container strength' },
  { group: 'icon', key: 'iconBorder', label: 'container border' },
  { group: 'icon', key: 'iconBorderColour', label: 'container border colour' },
  { group: 'arrow', key: 'arrowStyle', label: 'arrow style' },
  { group: 'arrow', key: 'arrowColour', label: 'arrow colour' },
  { group: 'decoration', key: 'mark', part: 'kind', label: 'decorative mark' },
]

/**
 * The Link list link's summary, as the shared design summary (design-summary.ts) is configured for it:
 * its own words and groups, and the Appearance switch. Set as `options.designSummary` on a link's design.
 */
export const LINK_DESIGN_SUMMARY: DesignSummaryConfig = {
  scope: 'item',
  scopeLabel: LINK_DESIGN_SCOPES.link,
  groups: LINK_DESIGN_GROUPS.map((id) => ({ id, title: LINK_DESIGN_GROUP_TITLES[id] })),
  properties: LINK_DESIGN_PROPERTIES,
  switchKey: 'appearance',
  testId: 'link-design-summary',
  followsText: 'Uses the Link list design',
  customisedNote: 'Everything not listed follows the Link list design.',
  customiseAction: 'Choose Customise this card',
  nothingSaved: 'Choose Customise this card to change only this link.',
  resetAllText: 'Reset this link',
}

/** The stored keys of a group, for a reset that clears only that group. */
export const keysOfGroup = (group: LinkDesignGroup): string[] =>
  keysOfDesignGroup(LINK_DESIGN_SUMMARY, group)

type StoredDesign = Record<string, unknown> | null | undefined

/** The properties a link's Appearance holds a choice for, whether or not it is switched on. */
export const chosenProperties = (design: StoredDesign): LinkDesignProperty[] =>
  chosenDesignProperties(LINK_DESIGN_SUMMARY, design) as LinkDesignProperty[]

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

/** What a link's design says, for its preview and the top of its Appearance. */
export function summariseLinkDesign(design: StoredDesign, maxLabels = 3): LinkDesignSummary {
  const {
    state,
    scopeLabel: _scope,
    ...summary
  } = summariseDesign(LINK_DESIGN_SUMMARY, design, maxLabels)
  return { ...summary, state: state === 'inherited' ? 'list' : 'custom' }
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${String(count)} ${count === 1 ? one : many}`

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
export const resetKeys = (design: StoredDesign, group: LinkDesignGroup): string[] =>
  designResetKeys(LINK_DESIGN_SUMMARY, design, group)

/** How many properties a group changes now, for the group's reset button. */
export const groupChanges = (design: StoredDesign, group: LinkDesignGroup): number =>
  designGroupChanges(LINK_DESIGN_SUMMARY, design, group)
