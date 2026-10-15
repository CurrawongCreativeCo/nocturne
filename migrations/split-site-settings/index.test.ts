import { describe, expect, it } from 'vitest'

import migration, { splitSettings } from './index'

const link = { _type: 'link', linkType: 'internal', internal: { _type: 'reference', _ref: 'p' } }
const settings = {
  _id: 'settings',
  _type: 'settings',
  title: 'Acme',
  description: 'Hello',
  allowAiCrawlers: false,
  headerNav: [{ _key: 'a', _type: 'navItem', label: 'Home', link }],
  footerText: 'Acme Ltd.',
  announcement: { _type: 'announcement', message: 'Sale', link, dismissible: true },
  consent: { _type: 'consent', title: 'Cookies', privacyLink: link },
}

describe('splitSettings', () => {
  it('copies each part into its own document', () => {
    const [identity, navigation, announcement, cookieBanner] = splitSettings(settings)
    expect(identity).toEqual({
      _id: 'siteIdentity',
      _type: 'siteIdentity',
      title: 'Acme',
      description: 'Hello',
      allowAiCrawlers: false,
    })
    expect(navigation).toEqual({
      _id: 'siteNavigation',
      _type: 'siteNavigation',
      headerNav: settings.headerNav,
      footerText: 'Acme Ltd.',
    })
    // Nested objects are flattened: their own `_type` is dropped.
    expect(announcement).toEqual({
      _id: 'announcement',
      _type: 'announcement',
      message: 'Sale',
      link,
      dismissible: true,
    })
    expect(cookieBanner).toEqual({
      _id: 'cookieBanner',
      _type: 'cookieBanner',
      title: 'Cookies',
      privacyLink: link,
    })
  })

  it('skips parts with nothing in them', () => {
    expect(splitSettings({ _id: 'settings', title: 'Acme' }).map((doc) => doc._id)).toEqual([
      'siteIdentity',
    ])
    expect(splitSettings({ _id: 'settings', announcement: {}, consent: null })).toEqual([])
  })

  it('keeps unpublished edits in drafts and ignores release versions', () => {
    expect(splitSettings({ ...settings, _id: 'drafts.settings' }).map((doc) => doc._id)).toEqual([
      'drafts.siteIdentity',
      'drafts.siteNavigation',
      'drafts.announcement',
      'drafts.cookieBanner',
    ])
    expect(splitSettings({ ...settings, _id: 'versions.rSummer.settings' })).toEqual([])
  })
})

describe('split-site-settings migration', () => {
  const handler = (migration.migrate as { document?: (doc: unknown, context: unknown) => unknown })
    .document

  it('creates the documents only when they do not exist yet (safe to run twice)', () => {
    const result = handler?.(settings, {}) as { type: string; document: { _id: string } }[]
    expect(result.map(({ type }) => type)).toEqual(Array(4).fill('createIfNotExists'))
    expect(result.map(({ document }) => document._id)).toEqual([
      'siteIdentity',
      'siteNavigation',
      'announcement',
      'cookieBanner',
    ])
  })

  it('does nothing for an empty settings document', () => {
    expect(handler?.({ _id: 'settings', _type: 'settings' }, {})).toBeUndefined()
  })
})
