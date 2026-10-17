import { describe, expect, it } from 'vitest'

import { pageTemplates } from './templates'

interface Value {
  title: string
  slug: { current: string }
  minimalLayout: boolean
  pageBuilder: { _type: string; [field: string]: unknown }[]
}

describe('the Link page template', () => {
  const template = pageTemplates.find(({ id }) => id === 'page-links')
  const value = (template?.value as () => Value)()

  it('is a page template called Link page', () => {
    expect(template).toMatchObject({ title: 'Link page', schemaType: 'page' })
  })

  it('starts as a minimal page at /links', () => {
    expect(value.slug.current).toBe('links')
    expect(value.minimalLayout).toBe(true)
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
