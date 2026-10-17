import { describe, expect, it } from 'vitest'

import {
  collectPanelOpeners,
  describeUsage,
  findPanelUsage,
  type PanelUsageSources,
} from './panel-usage'

const link = (panel: string, linkType = 'panel') => ({
  _type: 'link',
  linkType,
  panel: { _type: 'reference', _ref: panel },
})
const cta = (label: string, target: ReturnType<typeof link>) => ({
  _type: 'cta',
  label,
  link: target,
})

describe('collectPanelOpeners', () => {
  it('finds the buttons and the rich-text links that open the panel', () => {
    const content = [
      { _type: 'hero', ctas: [cta('Enquire', link('p1')), cta('Other', link('p2'))] },
      {
        _type: 'richText',
        body: [{ _type: 'block', markDefs: [link('p1'), link('p1'), link('p2')] }],
      },
    ]
    expect(collectPanelOpeners(content, 'p1')).toEqual({ buttons: ['Enquire'], textLinks: 2 })
  })

  it('ignores a link whose type was switched away from a panel', () => {
    expect(collectPanelOpeners([cta('Old', link('p1', 'internal'))], 'p1')).toEqual({
      buttons: [],
      textLinks: 0,
    })
  })

  it('names a button that has no label', () => {
    expect(collectPanelOpeners([{ _type: 'cta', link: link('p1') }], 'p1').buttons).toEqual([
      'Untitled button',
    ])
  })
})

describe('findPanelUsage', () => {
  const sources: PanelUsageSources = {
    pages: [
      { _id: 'a', title: 'Home', pageBuilder: [{ ctas: [cta('Enquire', link('p1'))] }] },
      { _id: 'b', title: 'About', pageBuilder: [{ ctas: [cta('Elsewhere', link('p2'))] }] },
      // A draft of Home that has dropped the button: the draft is what editors see.
      { _id: 'drafts.a', title: 'Home', pageBuilder: [{ ctas: [] }] },
      { _id: 'c', title: 'Contact', pageBuilder: [{ ctas: [cta('Enquire', link('p1'))] }] },
    ],
    sharedSections: [{ _id: 's', title: 'Promo', section: [{ ctas: [cta('Ask', link('p1'))] }] }],
    navigation: [{ _id: 'siteNavigation', headerCta: cta('Enquire', link('p1')) }],
  }

  it('lists only the places that open this panel, drafts counting', () => {
    const usage = findPanelUsage(sources, 'p1')
    expect(usage.documents.map(({ title, kind }) => [title, kind])).toEqual([
      ['Contact', 'page'],
      ['Promo', 'sharedSection'],
    ])
    expect(usage.menus).toEqual(['Header button'])
  })

  it('is empty for a panel nothing opens', () => {
    expect(findPanelUsage(sources, 'nobody')).toEqual({ documents: [], menus: [] })
  })
})

describe('describeUsage', () => {
  it('writes one line per place', () => {
    expect(
      describeUsage({
        documents: [
          {
            id: 'a',
            title: 'Home',
            kind: 'page',
            buttons: ['Enquire', 'Get a quote'],
            textLinks: 0,
          },
          { id: 'b', title: 'Promo', kind: 'sharedSection', buttons: [], textLinks: 1 },
          { id: 'c', title: 'About', kind: 'page', buttons: ['Ask'], textLinks: 2 },
        ],
        menus: ['Header button'],
      }),
    ).toEqual([
      'Home: “Enquire”, “Get a quote”',
      'Promo (shared section): 1 link in text',
      'About: “Ask” and 2 links in text',
      'Header button (a menu: opens its fallback link instead)',
    ])
  })
})
