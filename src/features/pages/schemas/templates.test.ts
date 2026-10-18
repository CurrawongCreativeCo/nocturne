import { describe, expect, it } from 'vitest'

import { sectionTypes } from './sections'
import { AGENCY_ONLY_TEMPLATE_IDS, pageTemplates } from './templates'

interface Value {
  title: string
  slug: { current: string }
  minimalLayout: boolean
  seo?: { noIndex?: boolean }
  pageBuilder: { _type: string; [field: string]: unknown }[]
}

describe('the Link page template', () => {
  const template = pageTemplates.find(({ id }) => id === 'page-links')
  const value = (template?.value as () => Value)()

  it('is a page template called Link page', () => {
    expect(template).toMatchObject({ title: 'Link page', schemaType: 'page' })
  })

  it('starts as a minimal page at /links, hidden from search engines', () => {
    expect(value.slug.current).toBe('links')
    expect(value.minimalLayout).toBe(true)
    // A list of links, not a page to rank; the pre-launch templates match (see EXPECTED below).
    expect(value.seo?.noIndex).toBe(true)
  })

  it('has a profile, a Minimal list with one featured link, and a footer note', () => {
    const [list, note] = value.pageBuilder
    expect(list).toMatchObject({
      _type: 'linkList',
      variant: 'stacked',
      socialSource: 'business',
      profile: { name: expect.any(String) as string, bio: expect.any(String) as string },
    })
    const links = list?.links as { featured: boolean; link: { url?: string } }[]
    expect(links).toHaveLength(3)
    expect(links.filter((link) => link.featured)).toHaveLength(1)
    expect(note?._type).toBe('richText')
  })

  it('leaves each link’s address empty, so nothing goes live until it is filled in', () => {
    const links = value.pageBuilder[0]?.links as { link: { url?: string } }[]
    for (const { link } of links) expect(link.url).toBeUndefined()
  })

  it('gives every new page its own keys', () => {
    const again = (template?.value as () => Value)()
    expect(again.pageBuilder[0]?._key).not.toBe(value.pageBuilder[0]?._key)
  })
})

describe('the pre-launch page templates', () => {
  const sectionNames = new Set(sectionTypes.map(({ name }) => name))
  const build = (id: string) => {
    const template = pageTemplates.find((candidate) => candidate.id === id)
    return (template?.value as () => Value)()
  }
  const types = (value: Value) => value.pageBuilder.map((item) => item._type)
  const text = (value: unknown) => JSON.stringify(value)

  const EXPECTED = [
    { id: 'page-links-coming-soon', slug: 'links', noIndex: true },
    { id: 'page-coming-soon', slug: 'coming-soon', noIndex: true },
    { id: 'page-under-construction', slug: 'under-construction', noIndex: true },
  ]

  it.each(EXPECTED)(
    '$id is a minimal page at /$slug, noIndex $noIndex',
    ({ id, slug, noIndex }) => {
      const value = build(id)
      expect(value.slug.current).toBe(slug)
      expect(value.minimalLayout).toBe(true)
      expect(value.seo?.noIndex === true).toBe(noIndex)
    },
  )

  it.each(EXPECTED)('$id uses only registered sections, each with its own key', ({ id }) => {
    const { pageBuilder } = build(id)
    for (const item of pageBuilder) expect(sectionNames).toContain(item._type)
    const keys = pageBuilder.map((item) => item._key)
    expect(new Set(keys).size).toBe(keys.length)
    const again = build(id).pageBuilder.map((item) => item._key)
    expect(again.some((key) => keys.includes(key))).toBe(false)
  })

  it('Link page + coming soon is the Link page with a note above and a signup below the list', () => {
    const value = build('page-links-coming-soon')
    expect(types(value)).toEqual(['richText', 'linkList', 'newsletterSignup', 'richText'])
    expect(text(value.pageBuilder[0])).toContain('Our new website is on its way')
    const links = value.pageBuilder[1]?.links as { label: string; featured: boolean }[]
    expect(links.map((link) => link.label)[0]).toBe('Book now')
    expect(links).toHaveLength(3)
    expect(links.filter((link) => link.featured)).toHaveLength(1)
    expect(value.pageBuilder[1]).toMatchObject({ variant: 'stacked', socialSource: 'business' })
  })

  it('Coming soon fills the screen with a centred-text hero, a signup and compact socials', () => {
    const value = build('page-coming-soon')
    expect(types(value)).toEqual(['hero', 'newsletterSignup', 'linkList'])
    expect(value.pageBuilder[0]).toMatchObject({
      variant: 'overlay',
      style: { tone: 'surface', fillScreen: true },
    })
    expect(value.pageBuilder[2]).toMatchObject({ variant: 'compact', socialSource: 'business' })
  })

  it('Under construction has no form chosen, so publishing waits for one', () => {
    const value = build('page-under-construction')
    expect(types(value)).toEqual(['hero', 'location', 'formSection'])
    expect(value.pageBuilder[2]).not.toHaveProperty('form')
    expect(value.pageBuilder[1]).not.toHaveProperty('mapImage')
  })

  it('starts the copy an editor must change with "Replace:", so launch:check finds it', () => {
    for (const { id } of EXPECTED) expect(text(build(id)), id).toContain('Replace:')
    expect(text(build('page-coming-soon'))).toContain('Replace: Opening [date]')
  })

  it('keeps Coming soon and Under construction away from clients', () => {
    const ids = [...AGENCY_ONLY_TEMPLATE_IDS].filter((id) => !id.includes('--'))
    expect(ids.sort()).toEqual(['page-coming-soon', 'page-under-construction'])
    expect(AGENCY_ONLY_TEMPLATE_IDS.has('page-links-coming-soon')).toBe(false)
    expect(AGENCY_ONLY_TEMPLATE_IDS.has('page-links')).toBe(false)
  })
})
