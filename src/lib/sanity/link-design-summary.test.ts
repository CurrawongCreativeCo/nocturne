import { describe, expect, it } from 'vitest'

import {
  chosenProperties,
  countCustomisedLinks,
  customisedLinksText,
  groupChanges,
  isChosen,
  keysOfGroup,
  listLabels,
  resetKeys,
  scopedTitle,
  summariseLinkDesign,
} from './link-design-summary'

describe('isChosen', () => {
  it('treats only an unset value as inherit', () => {
    expect(isChosen(undefined)).toBe(false)
    expect(isChosen(null)).toBe(false)
    expect(isChosen('')).toBe(false)
    expect(isChosen('none')).toBe(true)
    expect(isChosen(0)).toBe(true)
    expect(isChosen(false)).toBe(true)
  })

  it('reads a colour by its colour, with Inherit and an empty one not chosen', () => {
    expect(isChosen({})).toBe(false)
    expect(isChosen({ colour: 'inherit' })).toBe(false)
    expect(isChosen({ colour: '' })).toBe(false)
    expect(isChosen({ colour: 'transparent' })).toBe(true)
    expect(isChosen({ colour: 'custom', hex: '#aa0000' })).toBe(true)
    // The page draws nothing new for a Custom without a valid hex, so it is not a change.
    expect(isChosen({ colour: 'custom' })).toBe(false)
    expect(isChosen({ colour: 'custom', hex: 'red' })).toBe(false)
  })
})

describe('summariseLinkDesign', () => {
  it('says a link with no design uses the list’s', () => {
    for (const design of [undefined, null, {}, { appearance: undefined }]) {
      expect(summariseLinkDesign(design)).toMatchObject({
        state: 'list',
        changes: 0,
        text: 'Uses the Link list design',
        detail: 'Uses the Link list design',
      })
    }
  })

  it('names what a customised link changes, in form order', () => {
    const summary = summariseLinkDesign({
      appearance: 'custom',
      iconBackgroundStrength: 'light',
      label: { colour: { colour: 'accent' } },
    })
    expect(summary.state).toBe('custom')
    expect(summary.changes).toBe(2)
    expect(summary.labels).toEqual(['label colour', 'container strength'])
    expect(summary.text).toBe('Customised · 2 changes')
    expect(summary.detail).toBe('Customised · 2 changes (label colour, container strength)')
  })

  it('counts a deliberate off value as a change', () => {
    const summary = summariseLinkDesign({
      appearance: 'custom',
      border: 'none',
      shadow: 'flat',
      arrowStyle: 'none',
      background: { colour: 'transparent' },
    })
    expect(summary.labels).toEqual(['background colour', 'border', 'shadow', 'arrow style'])
  })

  it('says so when a link is customised without changes, and singularises one change', () => {
    expect(summariseLinkDesign({ appearance: 'custom' }).text).toBe('Customised · no changes yet')
    expect(summariseLinkDesign({ appearance: 'custom', border: 'thin' }).text).toBe(
      'Customised · 1 change',
    )
  })

  it('ignores Inherit values and empty text objects', () => {
    const summary = summariseLinkDesign({
      appearance: 'custom',
      label: { colour: { colour: 'inherit' } },
      eyebrow: {},
      iconColour: { colour: '' },
    })
    expect(summary.changes).toBe(0)
  })

  it('shortens a long list of changes', () => {
    const summary = summariseLinkDesign({
      appearance: 'custom',
      border: 'thin',
      shadow: 'soft',
      arrowStyle: 'arrow',
      iconShape: 'circle',
      iconBorder: 'thin',
    })
    expect(summary.detail).toBe(
      'Customised · 5 changes (border, shadow, icon container and 2 more)',
    )
  })

  it('keeps choices saved on a link that follows the list, and says they are not applied', () => {
    const summary = summariseLinkDesign({ border: 'thick', shadow: 'soft' })
    expect(summary.state).toBe('list')
    expect(summary.changes).toBe(0)
    expect(summary.kept).toBe(2)
    expect(summary.detail).toBe('Uses the Link list design (2 saved changes not applied)')
  })
})

describe('listLabels', () => {
  it('lists up to the maximum, then counts the rest', () => {
    expect(listLabels(['a', 'b'], 3)).toBe('a, b')
    expect(listLabels(['a', 'b', 'c', 'd'], 2)).toBe('a, b and 2 more')
  })
})

describe('countCustomisedLinks', () => {
  it('counts the links that change the list’s design', () => {
    expect(
      countCustomisedLinks([
        { design: { appearance: 'custom', border: 'thin' } },
        { design: { appearance: 'custom' } },
        { design: { border: 'thin' } },
        {},
        { design: { appearance: 'custom', label: { size: 'large' } } },
      ]),
    ).toBe(2)
    expect(countCustomisedLinks(undefined)).toBe(0)
  })

  it('words the count for a section row', () => {
    expect(customisedLinksText(0)).toBeUndefined()
    expect(customisedLinksText(1)).toBe('1 link customised')
    expect(customisedLinksText(3)).toBe('3 links customised')
  })
})

describe('reset', () => {
  const design = {
    appearance: 'custom',
    background: { colour: 'accent' },
    border: 'none',
    label: { colour: { colour: 'ink' } },
    iconColour: { colour: 'accent' },
  }

  it('groups the stored keys', () => {
    expect(keysOfGroup('card')).toEqual([
      'background',
      'backgroundStrength',
      'border',
      'borderColour',
      'shadow',
    ])
    expect(keysOfGroup('text')).toEqual(['eyebrow', 'label', 'description'])
  })

  it('clears only the group’s own saved keys, never another group’s or the switch', () => {
    expect(resetKeys(design, 'card')).toEqual(['background', 'border'])
    expect(resetKeys(design, 'text')).toEqual(['label'])
    expect(resetKeys(design, 'icon')).toEqual(['iconColour'])
    expect(resetKeys(design, 'arrow')).toEqual([])
    for (const group of ['card', 'text', 'icon', 'arrow'] as const) {
      expect(resetKeys(design, group)).not.toContain('appearance')
    }
  })

  it('counts a group’s changes', () => {
    expect(groupChanges(design, 'card')).toBe(2)
    expect(groupChanges(design, 'arrow')).toBe(0)
    expect(chosenProperties(design)).toHaveLength(4)
  })
})

describe('scopedTitle', () => {
  it('adds the level to a group heading', () => {
    expect(scopedTitle('Card', 'link')).toBe('Card · This link only')
    expect(scopedTitle('Cards', 'list')).toBe('Cards · All links in this list')
  })
})
