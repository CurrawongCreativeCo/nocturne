import { describe, expect, it } from 'vitest'

import {
  checklistProgress,
  evaluateChecklist,
  findLinkListPage,
  hasLinkList,
  portableTextOf,
  publicPageRows,
  type LaunchData,
} from './launch-checklist'
import { resolveVersions } from '../../content-health/utils/detect'

const link = (id: string) => ({ _type: 'link', linkType: 'internal', internal: { _ref: id } })
const note = (text: string) => ({
  _type: 'richText',
  body: [{ _type: 'block', children: [{ _type: 'span', text }] }],
})

/** A site that is ready to launch; each test spoils one thing. */
const ready = (): LaunchData => ({
  pages: [
    { _id: 'home-id', title: 'Home', slug: 'home', pageBuilder: [] },
    {
      _id: 'links-id',
      title: 'Links',
      slug: 'links',
      description: 'Where to find us.',
      ogImage: 'image-abc',
      pageBuilder: [{ _type: 'linkList', links: [] }],
    },
    { _id: 'about-id', title: 'About', slug: 'about', pageBuilder: [] },
  ],
  navigation: [
    {
      _id: 'siteNavigation',
      headerNav: [{ _type: 'navItem', link: link('about-id') }],
      headerCta: null,
      footerNav: [],
    },
  ],
  identity: [
    {
      _id: 'siteIdentity',
      browserIcon: { choice: 'upload', image: 'icon-asset' },
      logo: 'logo-asset',
    },
  ],
  business: [{ _id: 'businessInfo', phone: '02 5550 0000', publicEmail: null, socialCount: 2 }],
})

const statusOf = (data: LaunchData, id: string, homepage = 'links') =>
  evaluateChecklist(data, homepage).find((item) => item.id === id)?.status

describe('evaluateChecklist', () => {
  it('is all done for a site that is ready, with no reminder', () => {
    const items = evaluateChecklist(ready(), 'links')
    expect(items.every(({ status }) => status === 'done')).toBe(true)
    expect(items.map(({ id }) => id)).toEqual([
      'home-page',
      'temporary-page',
      'share-image',
      'menus-published',
      'menu-links',
      'browser-icon',
      'contact',
      'social',
    ])
    expect(checklistProgress(items)).toEqual({ done: 8, total: 8 })
  })

  it('needs a published home page', () => {
    const data = ready()
    data.pages = data.pages.filter((page) => page.slug !== 'home')
    expect(statusOf(data, 'home-page')).toBe('todo')
    // A home page that is only a draft is not published.
    data.pages.push({ _id: 'drafts.home-id', title: 'Home', slug: 'home' })
    expect(statusOf(data, 'home-page')).toBe('todo')
  })

  it('needs the temporary page published, and skips its share check until it is', () => {
    const data = ready()
    data.pages = data.pages.filter((page) => page.slug !== 'links')
    expect(statusOf(data, 'temporary-page')).toBe('todo')
    expect(statusOf(data, 'share-image')).toBeUndefined()
  })

  it('needs a share image and a description on the temporary page, or the site defaults', () => {
    const data = ready()
    const page = data.pages.find((candidate) => candidate.slug === 'links')
    if (!page) throw new Error('fixture')
    page.ogImage = null
    expect(statusOf(data, 'share-image')).toBe('todo')
    data.identity[0] = { ...data.identity[0], _id: 'siteIdentity', ogImage: 'default-share' }
    expect(statusOf(data, 'share-image')).toBe('done')
    page.description = ' '
    const item = evaluateChecklist(data, 'links').find(({ id }) => id === 'share-image')
    expect(item?.detail).toContain('a description')
    expect(item?.fix).toEqual({ intent: 'edit', type: 'page', id: 'links-id' })
  })

  it('needs published menus, and no menu link to an unpublished page', () => {
    const data = ready()
    data.navigation = [{ _id: 'drafts.siteNavigation', headerNav: [], footerNav: [] }]
    expect(statusOf(data, 'menus-published')).toBe('todo')

    const broken = ready()
    broken.navigation[0] = {
      _id: 'siteNavigation',
      headerNav: [{ _type: 'navItem', link: link('gone-id') }],
      footerNav: [{ _type: 'navItem', link: link('about-id') }],
    }
    expect(statusOf(broken, 'menu-links')).toBe('todo')
    expect(statusOf(broken, 'menus-published')).toBe('done')
  })

  it('counts a link to a page that is only a draft as broken', () => {
    const data = ready()
    data.pages = data.pages.filter((page) => page._id !== 'about-id')
    data.pages.push({ _id: 'drafts.about-id', title: 'About', slug: 'about' })
    expect(statusOf(data, 'menu-links')).toBe('todo')
  })

  it('has no menu-links item when there is no navigation at all', () => {
    const data = ready()
    data.navigation = []
    expect(statusOf(data, 'menu-links')).toBeUndefined()
    expect(statusOf(data, 'menus-published')).toBe('todo')
  })

  it('needs the client’s browser icon: the default, an empty upload and an unpublished choice fail', () => {
    const data = ready()
    data.identity = [{ _id: 'siteIdentity', browserIcon: { choice: 'default' } }]
    expect(statusOf(data, 'browser-icon')).toBe('todo')
    data.identity = [{ _id: 'siteIdentity', browserIcon: { choice: 'upload', image: null } }]
    expect(statusOf(data, 'browser-icon')).toBe('todo')
    data.identity = [{ _id: 'drafts.siteIdentity', browserIcon: { choice: 'upload', image: 'x' } }]
    expect(statusOf(data, 'browser-icon')).toBe('todo')
    data.identity = [{ _id: 'siteIdentity', browserIcon: { choice: 'logo' }, logo: 'logo-asset' }]
    expect(statusOf(data, 'browser-icon')).toBe('done')
    data.identity = [{ _id: 'siteIdentity', browserIcon: { choice: 'logo' } }]
    expect(statusOf(data, 'browser-icon')).toBe('todo')
  })

  it('needs a phone or an email, and a social link, in published Business info', () => {
    const data = ready()
    data.business = [
      { _id: 'businessInfo', phone: '', publicEmail: 'hi@example.com.au', socialCount: 0 },
    ]
    expect(statusOf(data, 'contact')).toBe('done')
    expect(statusOf(data, 'social')).toBe('todo')
    data.business = [{ _id: 'businessInfo', phone: ' ', publicEmail: null, socialCount: 1 }]
    expect(statusOf(data, 'contact')).toBe('todo')
    data.business = []
    expect(statusOf(data, 'contact')).toBe('todo')
    expect(statusOf(data, 'social')).toBe('todo')
  })

  it('reminds, without failing, when the temporary page still has the coming-soon note', () => {
    const data = ready()
    const page = data.pages.find((candidate) => candidate.slug === 'links')
    if (!page) throw new Error('fixture')
    page.pageBuilder = [note('Our new website is on its way. Until then, everything is here.')]
    const items = evaluateChecklist(data, 'links')
    expect(items.at(-1)).toMatchObject({ id: 'temporary-note', status: 'reminder' })
    // Not counted in progress either way.
    expect(checklistProgress(items)).toEqual({ done: 8, total: 8 })
    expect(items.some(({ status }) => status === 'todo')).toBe(false)
  })

  it('also finds leftover "Replace:" copy, and nothing in ordinary text', () => {
    const data = ready()
    const page = data.pages.find((candidate) => candidate.slug === 'links')
    if (!page) throw new Error('fixture')
    page.pageBuilder = [note('Replace: © Your business name.')]
    expect(statusOf(data, 'temporary-note')).toBe('reminder')
    page.pageBuilder = [note('© Test Co.')]
    expect(statusOf(data, 'temporary-note')).toBeUndefined()
  })

  it('points each fix at the right document', () => {
    const data: LaunchData = { pages: [], navigation: [], identity: [], business: [] }
    const fixes = Object.fromEntries(
      evaluateChecklist(data, 'links').map((item) => [item.id, item.fix]),
    )
    expect(fixes['home-page']).toEqual({ intent: 'create', type: 'page' })
    expect(fixes['menus-published']).toEqual({
      intent: 'edit',
      type: 'siteNavigation',
      id: 'siteNavigation',
    })
    expect(fixes['browser-icon']).toEqual({
      intent: 'edit',
      type: 'siteIdentity',
      id: 'siteIdentity',
    })
    expect(fixes.contact).toEqual({ intent: 'edit', type: 'businessInfo', id: 'businessInfo' })
  })

  it('follows a homepage other than links', () => {
    const data = ready()
    expect(statusOf(data, 'temporary-page', 'coming-soon')).toBe('todo')
  })
})

describe('publicPageRows', () => {
  it('lists the visible slugs in order, with unpublished ones marked', () => {
    const rows = publicPageRows(ready(), ['links', 'privacy', 'about'])
    expect(rows).toEqual([
      { slug: 'links', title: 'Links', id: 'links-id', path: '/links' },
      { slug: 'privacy', title: 'privacy', id: null, path: '/privacy' },
      { slug: 'about', title: 'About', id: 'about-id', path: '/about' },
    ])
  })

  it('ignores a draft-only page', () => {
    const data = ready()
    data.pages = [{ _id: 'drafts.links-id', title: 'Links', slug: 'links' }]
    expect(publicPageRows(data, ['links'])[0]?.id).toBeNull()
  })
})

describe('findLinkListPage', () => {
  const pages = (data: LaunchData) => resolveVersions(data.pages)

  it('finds the published page with a Link list, preferring the homepage', () => {
    const data = ready()
    data.pages.push({
      _id: 'other-id',
      title: 'Other links',
      slug: 'other',
      pageBuilder: [{ _type: 'linkList' }],
    })
    expect(findLinkListPage(pages(data), 'other')?.id).toBe('other-id')
    expect(findLinkListPage(pages(data), 'links')?.id).toBe('links-id')
    expect(findLinkListPage(pages(data))?.id).toBe('links-id')
  })

  it('is null when no published page uses one', () => {
    const data = ready()
    data.pages = data.pages.filter((page) => page.slug !== 'links')
    expect(findLinkListPage(pages(data), 'links')).toBeNull()
    data.pages.push({ _id: 'drafts.d', slug: 'd', pageBuilder: [{ _type: 'linkList' }] })
    expect(findLinkListPage(pages(data))).toBeNull()
  })
})

describe('small readers', () => {
  it('hasLinkList reads a page builder', () => {
    expect(hasLinkList([{ _type: 'hero' }, { _type: 'linkList' }])).toBe(true)
    expect(hasLinkList([{ _type: 'hero' }])).toBe(false)
    expect(hasLinkList(undefined)).toBe(false)
  })

  it('portableTextOf joins every span', () => {
    expect(
      portableTextOf([note('one'), { _type: 'hero', title: 'ignored' }, note('two')]).trim(),
    ).toBe('one  two')
  })
})
