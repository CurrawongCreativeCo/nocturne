import { describe, expect, it } from 'vitest'

import { DESIGN_GROUPS } from '@/lib/design/capabilities'

import {
  DESIGN_SCOPE_LABELS,
  defaultSummaryWording,
  designGroupChanges,
  designResetKeys,
  keysOfDesignGroup,
  orderDesignGroups,
  scopedGroupTitle,
  summariseDesign,
  type DesignSummaryConfig,
} from './design-summary'
import { LINK_DESIGN_SUMMARY, summariseLinkDesign } from './link-design-summary'

/** A section's Cards and Text, with no switch: the object always applies. */
const CARDS: DesignSummaryConfig = {
  scope: 'card',
  groups: [
    { id: 'cards', title: 'Cards' },
    { id: 'text', title: 'Text' },
  ],
  properties: [
    { group: 'cards', key: 'background', label: 'background colour' },
    { group: 'cards', key: 'border', label: 'border' },
    { group: 'cards', key: 'shadow', label: 'shadow' },
    { group: 'text', key: 'title', part: 'size', label: 'title size' },
    { group: 'text', key: 'title', part: 'colour', label: 'title colour' },
  ],
  ...defaultSummaryWording('card', 'the site design'),
}

describe('scope labels and group names', () => {
  it('names each scope for editors', () => {
    expect(DESIGN_SCOPE_LABELS).toEqual({
      site: 'Whole site',
      section: 'This section',
      card: 'All cards in this section',
      item: 'This card only',
    })
    expect(scopedGroupTitle('Cards', 'card')).toBe('Cards · All cards in this section')
    expect(scopedGroupTitle('Text', 'item')).toBe('Text · This card only')
  })

  it('puts the standard capability groups first, in order, then a section style’s own', () => {
    const shuffled = [
      'Decoration',
      'Section style',
      'Icons',
      'Cards',
      'Pictures',
      'Actions',
      'Text',
    ]
    expect(
      orderDesignGroups(shuffled.map((title) => ({ title })).reverse()).map((g) => g.title),
    ).toEqual([...DESIGN_GROUPS, 'Section style'])
    expect(DESIGN_GROUPS).toEqual(['Cards', 'Text', 'Icons', 'Actions', 'Pictures', 'Decoration'])
  })
})

describe('summariseDesign without a switch', () => {
  it('says an object with no choices follows what is above, and carries its scope', () => {
    for (const design of [undefined, null, {}, { border: undefined }]) {
      expect(summariseDesign(CARDS, design)).toMatchObject({
        state: 'inherited',
        changes: 0,
        text: 'Uses the site design',
        scopeLabel: 'All cards in this section',
      })
    }
  })

  it('counts and names what it changes, in form order, as "Customised · N changes (…)"', () => {
    const summary = summariseDesign(CARDS, {
      title: { colour: { colour: 'accent' } },
      border: 'thin',
    })
    expect(summary).toMatchObject({
      state: 'custom',
      changes: 2,
      labels: ['border', 'title colour'],
      text: 'Customised · 2 changes',
      detail: 'Customised · 2 changes (border, title colour)',
    })
    expect(summariseDesign(CARDS, { border: 'thin' }).text).toBe('Customised · 1 change')
  })

  it('counts None, Off, Flat and Transparent as choices, and Inherit values as nothing', () => {
    expect(
      summariseDesign(CARDS, {
        border: 'none',
        shadow: 'flat',
        background: { colour: 'transparent' },
      }).labels,
    ).toEqual(['background colour', 'border', 'shadow'])
    expect(
      summariseDesign(CARDS, {
        title: { colour: { colour: 'inherit' } },
        background: { colour: '' },
      }).changes,
    ).toBe(0)
  })

  it('shortens a long list, and takes the limit as an argument', () => {
    const design = { background: { colour: 'accent' }, border: 'thin', shadow: 'soft' }
    expect(summariseDesign(CARDS, design, 2).detail).toBe(
      'Customised · 3 changes (background colour, border and 1 more)',
    )
  })

  it('uses the scope’s own label unless the config words it', () => {
    expect(summariseDesign({ ...CARDS, scope: 'site' }, {}).scopeLabel).toBe('Whole site')
    expect(summariseDesign({ ...CARDS, scopeLabel: 'All plans' }, {}).scopeLabel).toBe('All plans')
  })
})

describe('resets', () => {
  const design = {
    background: { colour: 'accent' },
    border: 'none',
    title: { colour: { colour: 'ink' } },
    note: 'not a listed key',
  }

  it('groups the stored keys, each once', () => {
    expect(keysOfDesignGroup(CARDS, 'cards')).toEqual(['background', 'border', 'shadow'])
    expect(keysOfDesignGroup(CARDS, 'text')).toEqual(['title'])
  })

  it('clears only a group’s own saved keys, never another group’s', () => {
    expect(designResetKeys(CARDS, design, 'cards')).toEqual(['background', 'border'])
    expect(designResetKeys(CARDS, design, 'text')).toEqual(['title'])
    expect(designResetKeys(CARDS, {}, 'cards')).toEqual([])
  })

  it('counts a group’s changes for its button', () => {
    expect(designGroupChanges(CARDS, design, 'cards')).toBe(2)
    expect(designGroupChanges(CARDS, design, 'text')).toBe(1)
    expect(designGroupChanges(CARDS, undefined, 'text')).toBe(0)
  })
})

describe('the Link list link, as the same summary configured with its own words', () => {
  it('keeps its switch, scope label and wording', () => {
    expect(LINK_DESIGN_SUMMARY).toMatchObject({
      scope: 'item',
      scopeLabel: 'This link only',
      switchKey: 'appearance',
      followsText: 'Uses the Link list design',
      resetAllText: 'Reset this link',
      testId: 'link-design-summary',
    })
    expect(LINK_DESIGN_SUMMARY.groups.map((group) => group.title)).toEqual([
      'Card',
      'Text',
      'Icon',
      'Arrow',
    ])
  })

  it('says exactly what summariseLinkDesign says, for every state', () => {
    const states = [
      undefined,
      {},
      { appearance: 'custom' },
      { appearance: 'custom', border: 'thin' },
      { border: 'thick', shadow: 'soft' },
      { appearance: 'custom', arrowStyle: 'none', label: { colour: { colour: 'accent' } } },
    ]
    for (const design of states) {
      const shared = summariseDesign(LINK_DESIGN_SUMMARY, design)
      const link = summariseLinkDesign(design)
      expect({
        state: shared.state === 'inherited' ? 'list' : 'custom',
        changes: shared.changes,
        kept: shared.kept,
        labels: shared.labels,
        text: shared.text,
        detail: shared.detail,
      }).toEqual(link)
    }
  })
})
