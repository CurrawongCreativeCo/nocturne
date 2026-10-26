import { describe, expect, it } from 'vitest'

import {
  CLIENT_REUSABLE_IDS,
  CLIENT_STRUCTURE_IDS,
  CLIENT_WEBSITE_SETTINGS_IDS,
  filterStructureItems,
  WAITING_FOR_REVIEW_FILTER,
  WAITING_FOR_REVIEW_ID,
  waitingForReviewTitle,
} from './structure-access'

const idOf = (item: string) => (item === '---' ? null : item)

describe('filterStructureItems', () => {
  const items = ['pages', 'blog', '---', 'reusable', 'websiteSettings', 'design', '---', 'advanced']

  it('leaves agency staff with everything', () => {
    expect(filterStructureItems(items, 'agency', idOf)).toEqual(items)
  })

  it.each(['editor', 'contributor'] as const)('limits a %s to the client items', (audience) => {
    expect(filterStructureItems(items, audience, idOf)).toEqual([
      'pages',
      'blog',
      '---',
      'reusable',
      'websiteSettings',
    ])
  })

  it('hides design and advanced from clients', () => {
    const shown = filterStructureItems(items, 'editor', idOf)
    for (const hidden of ['design', 'advanced']) expect(shown).not.toContain(hidden)
  })

  it('lists exactly the client items', () => {
    expect([...CLIENT_STRUCTURE_IDS].sort()).toEqual(
      [
        'blog',
        'businessInfo',
        'enquiries',
        'events',
        'pages',
        'reusable',
        'team',
        'websiteSettings',
      ].sort(),
    )
  })

  it('limits clients to Panels inside Reusable content, which they edit but the agency creates', () => {
    const reusable = ['sharedSection', 'form', 'panel']
    expect(filterStructureItems(reusable, 'editor', idOf, CLIENT_REUSABLE_IDS)).toEqual(['panel'])
    expect(filterStructureItems(reusable, 'agency', idOf, CLIENT_REUSABLE_IDS)).toEqual(reusable)
  })

  it('limits clients to Name, logo & icon, Navigation and Announcement bar inside Website settings', () => {
    const screens = ['siteIdentity', 'siteNavigation', 'announcement', 'cookieBanner', 'brand']
    expect(filterStructureItems(screens, 'editor', idOf, CLIENT_WEBSITE_SETTINGS_IDS)).toEqual([
      'siteIdentity',
      'siteNavigation',
      'announcement',
    ])
    expect(filterStructureItems(screens, 'agency', idOf, CLIENT_WEBSITE_SETTINGS_IDS)).toEqual(
      screens,
    )
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

describe('Waiting for review', () => {
  it('is agency only: clients never see it, whatever the list', () => {
    expect(CLIENT_STRUCTURE_IDS.has(WAITING_FOR_REVIEW_ID)).toBe(false)
    const items = ['pages', WAITING_FOR_REVIEW_ID]
    expect(filterStructureItems(items, 'contributor', idOf)).toEqual(['pages'])
    expect(filterStructureItems(items, 'editor', idOf)).toEqual(['pages'])
    expect(filterStructureItems(items, 'agency', idOf)).toEqual(items)
  })

  it('lists documents that have drafts', () => {
    expect(WAITING_FOR_REVIEW_FILTER).toBe('_id in path("drafts.**")')
  })

  it('counts what is waiting in the title', () => {
    expect(waitingForReviewTitle(0)).toBe('Waiting for review')
    expect(waitingForReviewTitle(3)).toBe('Waiting for review (3)')
  })
})

describe('Features & setup', () => {
  it('is agency only: clients never get it in Website settings, and the list they see is unchanged', () => {
    const ids = [
      'siteIdentity',
      'siteNavigation',
      'announcement',
      'cookieBanner',
      'launch',
      'setup',
    ]
    const seen = filterStructureItems(ids, 'editor', (id) => id, CLIENT_WEBSITE_SETTINGS_IDS)
    expect(seen).toEqual(['siteIdentity', 'siteNavigation', 'announcement', 'launch'])
    expect(filterStructureItems(ids, 'agency', (id) => id, CLIENT_WEBSITE_SETTINGS_IDS)).toEqual(
      ids,
    )
  })
})
