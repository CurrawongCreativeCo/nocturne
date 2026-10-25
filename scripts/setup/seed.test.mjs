import { describe, expect, it } from 'vitest'

import { seedDocuments } from './seed.mjs'

const byId = (docs) => Object.fromEntries(docs.map((doc) => [doc._id, doc]))

/** Every `_ref` in a document, with whether the reference is weak. */
function refs(value, found = []) {
  if (Array.isArray(value)) value.forEach((v) => refs(v, found))
  else if (value && typeof value === 'object') {
    if (typeof value._ref === 'string') found.push({ id: value._ref, weak: value._weak === true })
    Object.values(value).forEach((v) => refs(v, found))
  }
  return found
}

describe('seedDocuments (live)', () => {
  const docs = seedDocuments('Acme')
  const ids = byId(docs)

  it('publishes Home and About with menus, and has no Link page', () => {
    expect(ids['page-home']).toBeDefined()
    expect(ids['page-about']).toBeDefined()
    expect(ids['page-links']).toBeUndefined()
    expect(docs.some((doc) => doc._id.startsWith('drafts.'))).toBe(false)
    expect(ids.siteNavigation.headerNav).toHaveLength(2)
    expect(ids.siteNavigation.headerCta).toBeDefined()
  })

  it('uses strong references', () => {
    expect(refs(docs).every((r) => !r.weak)).toBe(true)
  })

  it('sets a placeholder verification marker from the site name, in both modes', () => {
    expect(ids.siteIdentity.verificationMarker).toBe('nocturne-acme')
    expect(
      byId(seedDocuments('Acme & Sons!', { prelaunch: true })).siteIdentity.verificationMarker,
    ).toBe('nocturne-acme-sons')
  })

  it('is unchanged by an explicit prelaunch: false', () => {
    const strip = (list) => JSON.stringify(list, (k, v) => (k === '_key' ? undefined : v))
    expect(strip(seedDocuments('Acme', { prelaunch: false }))).toBe(strip(docs))
  })
})

describe('seedDocuments (prelaunch)', () => {
  const docs = seedDocuments('Acme', { prelaunch: true })
  const ids = byId(docs)

  it('publishes a Link page with the site name in the profile', () => {
    const page = ids['page-links']
    expect(page).toMatchObject({
      _type: 'page',
      slug: { current: 'links' },
      minimalLayout: true,
      seo: { noIndex: true },
    })
    const list = page.pageBuilder.find((s) => s._type === 'linkList')
    expect(list.profile.name).toBe('Acme')
    expect(page.pageBuilder.map((s) => s._type)).toEqual([
      'richText',
      'linkList',
      'newsletterSignup',
    ])
  })

  it('never publishes a link without an address', () => {
    const list = ids['page-links'].pageBuilder.find((s) => s._type === 'linkList')
    expect(list.links.every((l) => l.visibility === 'hide')).toBe(true)
  })

  it('saves Home and About as drafts only', () => {
    expect(ids['drafts.page-home']).toMatchObject({ _type: 'page', title: 'Home' })
    expect(ids['drafts.page-about']).toMatchObject({ _type: 'page', title: 'About' })
    expect(ids['page-home']).toBeUndefined()
    expect(ids['page-about']).toBeUndefined()
  })

  it('leaves the menus empty', () => {
    expect(ids.siteNavigation.headerNav).toEqual([])
    expect(ids.siteNavigation.footerNav).toEqual([])
    expect(ids.siteNavigation.headerCta).toBeUndefined()
  })

  it('makes every reference to an unpublished page weak', () => {
    const found = refs(docs)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((r) => r.weak)).toBe(true)
  })

  it('has unique IDs and still seeds the empty singletons', () => {
    expect(new Set(docs.map((d) => d._id)).size).toBe(docs.length)
    for (const id of [
      'siteIdentity',
      'designSettings',
      'announcement',
      'cookieBanner',
      'businessInfo',
    ])
      expect(ids[id]).toBeDefined()
  })
})
