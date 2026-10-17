import { describe, expect, it } from 'vitest'

import { DEFAULT_FEATURES } from '@/config/profile'

import { buildQuickActions, toolHref } from './quick-actions'

const ALL_TYPES = new Set(['post', 'event', 'teamMember', 'businessInfo'])
const ids = (features = DEFAULT_FEATURES, types: ReadonlySet<string> = ALL_TYPES) =>
  buildQuickActions({ features }, types).map(({ id }) => id)

describe('buildQuickActions', () => {
  it('offers every card when the site has every feature and type', () => {
    expect(ids()).toEqual(['website', 'blog', 'events', 'team', 'business', 'help'])
  })

  it('always offers editing the website and help', () => {
    expect(
      ids(
        { ...DEFAULT_FEATURES, blog: false, events: false, team: false, businessInfo: false },
        new Set(),
      ),
    ).toEqual(['website', 'help'])
  })

  it('drops the blog card when the profile turns the blog off', () => {
    expect(ids({ ...DEFAULT_FEATURES, blog: false })).not.toContain('blog')
  })

  it('drops a card whose document type is not in the schema, even with the feature on', () => {
    expect(ids(DEFAULT_FEATURES, new Set(['post', 'businessInfo']))).toEqual([
      'website',
      'blog',
      'business',
      'help',
    ])
  })

  it('points the cards at the right places', () => {
    const byId = Object.fromEntries(
      buildQuickActions({ features: DEFAULT_FEATURES }, ALL_TYPES).map((a) => [a.id, a]),
    )
    expect(byId.website?.target).toEqual({
      kind: 'tool',
      tool: 'presentation',
      search: 'preview=%2F',
    })
    expect(byId.blog?.target).toEqual({
      kind: 'intent',
      intent: 'create',
      params: { type: 'post' },
    })
    expect(byId.business?.target).toEqual({
      kind: 'intent',
      intent: 'edit',
      params: { type: 'businessInfo', id: 'businessInfo' },
    })
    expect(byId.help?.target).toEqual({ kind: 'help' })
  })
})

describe('toolHref', () => {
  it('builds a Studio URL with an optional path and query', () => {
    expect(toolHref({ kind: 'tool', tool: 'presentation', search: 'preview=%2F' }, '/studio')).toBe(
      '/studio/presentation?preview=%2F',
    )
    expect(toolHref({ kind: 'tool', tool: 'structure', path: '/team' }, '/studio')).toBe(
      '/studio/structure/team',
    )
  })
})
