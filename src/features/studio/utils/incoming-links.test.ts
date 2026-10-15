import { describe, expect, it } from 'vitest'

import { findIncomingLinks, type LinkSources } from './incoming-links'

const link = (ref: string) => ({ _type: 'link', linkType: 'internal', internal: { _ref: ref } })

const sources: LinkSources = {
  pages: [
    { _id: 'target', title: 'Target', pageBuilder: [{ cta: link('target') }] },
    { _id: 'a', title: 'About', pageBuilder: [{ cta: link('target') }] },
    { _id: 'drafts.b', title: 'Draft only', pageBuilder: [{ cta: link('target') }] },
    { _id: 'c', title: 'Unrelated', pageBuilder: [{ cta: link('other') }] },
  ],
  sharedSections: [{ _id: 's', title: 'Banner', section: { cta: link('target') } }],
  navigation: [{ _id: 'siteNavigation', headerNav: [{ link: link('target') }], footerNav: [] }],
}

describe('findIncomingLinks', () => {
  it('lists the menus and documents that link to the page, not the page itself', () => {
    expect(findIncomingLinks(sources, 'target')).toEqual({
      menus: ['Header menu'],
      documents: [
        { id: 'a', title: 'About', kind: 'page' },
        { id: 'b', title: 'Draft only', kind: 'page' },
        { id: 's', title: 'Banner', kind: 'sharedSection' },
      ],
    })
  })
  it('is empty when nothing links', () => {
    expect(findIncomingLinks(sources, 'nobody')).toEqual({ menus: [], documents: [] })
  })
  it('ignores a stale reference on an external link', () => {
    const stale = { _type: 'link', linkType: 'external', internal: { _ref: 'target' } }
    const result = findIncomingLinks(
      {
        pages: [{ _id: 'a', title: 'A', pageBuilder: [stale] }],
        sharedSections: [],
        navigation: [],
      },
      'target',
    )
    expect(result.documents).toEqual([])
  })
})
