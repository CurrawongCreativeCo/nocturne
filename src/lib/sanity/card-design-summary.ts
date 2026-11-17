import type { TextRole } from '@/lib/design/capabilities'

import type { DesignSummaryConfig } from './design-summary'

/**
 * A card family's item Appearance summary (README, "Design capability contract"): what a customised
 * item changes, at which level, which stored keys a reset must clear. Configured from the roles the
 * family draws, so it can't name a field the form doesn't offer (card-design-summary.test.ts holds the
 * two equal). Set as `options.designSummary` on the item's `design` object.
 */

const PART_LABELS: Record<string, string> = {
  size: 'size',
  weight: 'weight',
  colour: 'colour',
  textCase: 'letters',
  tracking: 'letter spacing',
  leading: 'line height',
  fontStyle: 'style',
}

export function cardFamilySummary({
  noun,
  roles,
  rolePartsOf,
  mark = true,
}: {
  /** What an item is called in a sentence: "plan". */
  noun: string
  roles: readonly TextRole[]
  /** The parts each role's field offers (textRoleParts). */
  rolePartsOf: (role: TextRole) => readonly string[]
  mark?: boolean
}): DesignSummaryConfig {
  return {
    scope: 'item',
    scopeLabel: `This ${noun} only`,
    groups: [
      { id: 'card', title: 'Card' },
      { id: 'text', title: 'Text' },
      ...(mark ? [{ id: 'decoration', title: 'Decoration' }] : []),
    ],
    properties: [
      { group: 'card', key: 'background', label: 'background colour' },
      { group: 'card', key: 'backgroundStrength', label: 'background strength' },
      { group: 'card', key: 'border', label: 'border' },
      { group: 'card', key: 'borderColour', label: 'border colour' },
      ...roles.flatMap((role) =>
        rolePartsOf(role).map((part) => ({
          group: 'text',
          key: role,
          part,
          label: `${role} ${PART_LABELS[part] ?? part}`,
        })),
      ),
      ...(mark
        ? [{ group: 'decoration', key: 'mark', part: 'kind', label: 'decorative mark' }]
        : []),
    ],
    switchKey: 'appearance',
    testId: `${noun}-design-summary`,
    followsText: 'Uses the section’s card design',
    customisedNote: 'Everything not listed follows the section’s card design.',
    customiseAction: 'Choose Customise this card',
    nothingSaved: `Choose Customise this card to change only this ${noun}.`,
    resetAllText: `Reset this ${noun}`,
  }
}
