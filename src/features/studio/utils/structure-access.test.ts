import { describe, expect, it } from 'vitest'

import { filterStructureItems } from './structure-access'

const idOf = (item: string) => (item === '---' ? null : item)

describe('filterStructureItems', () => {
  const items = [
    'settings',
    '---',
    'pages',
    'sharedSection',
    'form',
    'blog',
    'redirect',
    'experiment',
    'stripePrice',
    '---',
    'someNewType',
  ]

  it('leaves agency staff with everything', () => {
    expect(filterStructureItems(items, 'agency', idOf)).toEqual(items)
  })

  it.each(['editor', 'contributor'] as const)('limits a %s to the client items', (audience) => {
    expect(filterStructureItems(items, audience, idOf)).toEqual([
      'settings',
      '---',
      'pages',
      'blog',
    ])
  })

  it('hides forms, redirects, A/B tests, Stripe prices and shared sections from clients', () => {
    const shown = filterStructureItems(items, 'editor', idOf)
    for (const hidden of ['form', 'redirect', 'experiment', 'stripePrice', 'sharedSection']) {
      expect(shown).not.toContain(hidden)
    }
  })

  it('shows Team and Business info when the site has them', () => {
    expect(filterStructureItems(['businessInfo', 'team', 'form'], 'editor', idOf)).toEqual([
      'businessInfo',
      'team',
    ])
  })

  it('removes dividers that lead, trail or double up', () => {
    expect(
      filterStructureItems(['---', 'form', '---', 'pages', '---', 'form'], 'editor', idOf),
    ).toEqual(['pages'])
    expect(filterStructureItems(['pages', '---', 'form', '---', 'blog'], 'editor', idOf)).toEqual([
      'pages',
      '---',
      'blog',
    ])
  })

  it('drops items without an id for clients', () => {
    expect(
      filterStructureItems(['pages', 'x'], 'editor', (i) => (i === 'x' ? undefined : i)),
    ).toEqual(['pages'])
  })
})
