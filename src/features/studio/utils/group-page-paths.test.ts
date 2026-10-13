import { describe, expect, it } from 'vitest'

import { groupPagePaths } from './group-page-paths'

describe('groupPagePaths', () => {
  it('creates a folder for each first segment that has children', () => {
    const tree = groupPagePaths([
      { _id: 'a', slug: 'services/web-design' },
      { _id: 'b', slug: 'services/seo' },
      { _id: 'c', slug: 'blog/hello' },
      { _id: 'd', slug: 'about' },
    ])
    expect(tree.folders).toEqual(['blog', 'services'])
    expect(tree.topLevelIds).toEqual(['d'])
  })

  it('nests deeper paths under their first segment', () => {
    const tree = groupPagePaths([
      { _id: 'a', slug: 'docs/api/auth' },
      { _id: 'b', slug: 'docs/intro' },
    ])
    expect(tree).toEqual({ topLevelIds: [], folders: ['docs'] })
  })

  it('keeps the home page top level', () => {
    expect(groupPagePaths([{ _id: 'h', slug: 'home' }])).toEqual({
      topLevelIds: ['h'],
      folders: [],
    })
  })

  it('keeps pages with a missing or empty slug top level', () => {
    const tree = groupPagePaths([{ _id: 'a' }, { _id: 'b', slug: null }, { _id: 'c', slug: '' }])
    expect(tree).toEqual({ topLevelIds: ['a', 'b', 'c'], folders: [] })
  })

  it('counts a draft and its published version once', () => {
    const tree = groupPagePaths([
      { _id: 'drafts.a', slug: 'about' },
      { _id: 'a', slug: 'about' },
    ])
    expect(tree.topLevelIds).toEqual(['a'])
  })
})
