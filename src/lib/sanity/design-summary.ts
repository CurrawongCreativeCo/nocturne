import { DESIGN_GROUPS } from '@/lib/design/capabilities'

import { themeColourCss } from './theme-colour'

/**
 * Reading a design object at a glance, for any section, card or item that sets `options.designSummary`
 * (task 275; README, "Design capability contract"): what it changes, at which level, which stored keys
 * a reset must clear. Generalised from the Link list link's summary (link-design-summary.ts), whose
 * wording and behaviour come out of the same functions unchanged. Pure; nothing here changes how a
 * component is drawn. The Studio input is features/studio/components/design-summary-input.tsx.
 *
 * Unset inherits at every level: only an unset value is not a change, and None, Off, Transparent, Flat,
 * `0` and `false` are choices (design-overrides.ts).
 */

/** At which level a group of design controls applies. */
export type DesignScope = 'site' | 'section' | 'card' | 'item'

export const DESIGN_SCOPE_LABELS: Record<DesignScope, string> = {
  site: 'Whole site',
  section: 'This section',
  card: 'All cards in this section',
  item: 'This card only',
}

/** A group heading with its scope: "Cards · All cards in this section". */
export const scopedGroupTitle = (title: string, scope: DesignScope, labels = DESIGN_SCOPE_LABELS) =>
  `${title} · ${labels[scope]}`

/**
 * Standard capability group names, in order: Cards, Text, Icons, Actions, Pictures, Decoration, then a
 * section style's own groups (which keep their names and order after these).
 */
export const orderDesignGroups = <T extends { title: string }>(groups: readonly T[]): T[] => {
  const rank = (title: string) => {
    const index = (DESIGN_GROUPS as readonly string[]).indexOf(title)
    return index === -1 ? DESIGN_GROUPS.length : index
  }
  return [...groups].sort((a, b) => rank(a.title) - rank(b.title))
}

/**
 * A stored key of a design object, as editors name it. `key` is the field on the design object;
 * `part` is the property inside it for text (`label.colour`) and unset for the rest.
 */
export interface DesignProperty {
  group: string
  key: string
  part?: string
  /** Lower case, as it reads inside a sentence: "label colour". */
  label: string
}

export interface DesignGroup {
  id: string
  title: string
}

/**
 * What a design object's summary says and clears. The wording is data so an existing summary (the Link
 * list's) keeps its own words; the defaults suit a new one.
 */
export interface DesignSummaryConfig {
  scope: DesignScope
  /** Overrides the scope's label ("This link only"). */
  scopeLabel?: string
  groups: readonly DesignGroup[]
  properties: readonly DesignProperty[]
  /**
   * A field that must equal `'custom'` for the choices to apply (a link's Appearance switch). Without
   * one the design object always applies, and is customised as soon as it holds a change.
   */
  switchKey?: string
  /** The summary's `data-testid`, for tests and the Studio checks that find it. */
  testId?: string
  /** What an unset design follows: "Uses the Link list design". */
  followsText: string
  /** The sentence after the scope while customised: "Everything not listed follows the Link list design." */
  customisedNote: string
  /**
   * How to apply choices saved on an object that follows what is above ("Choose Customise this card"),
   * said as "<this> to use it". Only objects with a switch can hold such choices.
   */
  customiseAction: string
  /** Shown instead when nothing is saved. */
  nothingSaved: string
  /** The button that clears the whole object. */
  resetAllText: string
}

/** The words a new summary starts with: scope-based, with "Reset all". */
export function defaultSummaryWording(
  scope: DesignScope,
  follows: string,
): Pick<
  DesignSummaryConfig,
  'followsText' | 'customisedNote' | 'customiseAction' | 'nothingSaved' | 'resetAllText'
> {
  return {
    followsText: `Uses ${follows}`,
    customisedNote: `Everything not listed follows ${follows}.`,
    customiseAction: 'Change an option below to use it.',
    nothingSaved: `Change an option below to change ${scope === 'site' ? 'the whole site' : DESIGN_SCOPE_LABELS[scope].toLowerCase()}.`,
    resetAllText: 'Reset all',
  }
}

/**
 * Whether a stored value is a choice. Only an unset value inherits: a border of "none", a transparent
 * background, `0` and `false` are choices (design-overrides.ts). A colour is stored as `{ colour, hex }`
 * and counts only when the page draws it (`themeColourCss`): an empty or "inherit" colour, or a Custom
 * without a valid hex, inherits.
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

/** The stored keys of a group, for a reset that clears only that group. */
export const keysOfDesignGroup = (config: DesignSummaryConfig, group: string): string[] => [
  ...new Set(config.properties.filter((p) => p.group === group).map((p) => p.key)),
]

/** The properties a design object holds a choice for, whether or not it is switched on. */
export const chosenDesignProperties = (
  config: DesignSummaryConfig,
  design: StoredDesign,
): DesignProperty[] => config.properties.filter((property) => isChosen(valueOf(design, property)))

export interface DesignSummary {
  /** `inherited`: the page follows what is above. `custom`: this object's choices apply. */
  state: 'inherited' | 'custom'
  /** How many properties it changes (0 while it follows what is above). */
  changes: number
  /** Choices saved on an object that follows what is above: kept, but not applied. */
  kept: number
  /** Names of what changes, in form order. */
  labels: string[]
  /** "Uses the Link list design" or "Customised · 2 changes". */
  text: string
  /** The same with what changes: "Customised · 2 changes (label colour, container strength)". */
  detail: string
  /** "This link only". */
  scopeLabel: string
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${String(count)} ${count === 1 ? one : many}`

/** The short names for a sentence: the first few, then "and 2 more". */
export function listLabels(labels: readonly string[], max = 3): string {
  if (labels.length <= max) return labels.join(', ')
  return `${labels.slice(0, max).join(', ')} and ${String(labels.length - max)} more`
}

/** What a design object says, for its preview and the top of its fields. */
export function summariseDesign(
  config: DesignSummaryConfig,
  design: StoredDesign,
  maxLabels = 3,
): DesignSummary {
  const chosen = chosenDesignProperties(config, design)
  const scopeLabel = config.scopeLabel ?? DESIGN_SCOPE_LABELS[config.scope]
  const applies = config.switchKey === undefined || design?.[config.switchKey] === 'custom'
  if (!applies) {
    return {
      state: 'inherited',
      changes: 0,
      kept: chosen.length,
      labels: [],
      text: config.followsText,
      detail:
        chosen.length > 0
          ? `${config.followsText} (${plural(chosen.length, 'saved change')} not applied)`
          : config.followsText,
      scopeLabel,
    }
  }
  const labels = chosen.map((property) => property.label)
  if (config.switchKey === undefined && labels.length === 0) {
    return {
      state: 'inherited',
      changes: 0,
      kept: 0,
      labels: [],
      text: config.followsText,
      detail: config.followsText,
      scopeLabel,
    }
  }
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
    scopeLabel,
  }
}

/**
 * The stored keys a group's reset clears: its own keys that hold anything, never another group's,
 * and never the switch. Hidden values count: a reset removes what is saved, not only what shows.
 */
export const designResetKeys = (
  config: DesignSummaryConfig,
  design: StoredDesign,
  group: string,
): string[] => keysOfDesignGroup(config, group).filter((key) => design?.[key] !== undefined)

/** How many properties a group changes now, for the group's reset button. */
export const designGroupChanges = (
  config: DesignSummaryConfig,
  design: StoredDesign,
  group: string,
): number =>
  chosenDesignProperties(config, design).filter((property) => property.group === group).length
