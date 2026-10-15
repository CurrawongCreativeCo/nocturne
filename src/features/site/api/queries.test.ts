import * as groq from 'groq-js'
import { describe, expect, it } from 'vitest'

import { SETTINGS_QUERY } from './queries'

// groq-js 2's type declarations don't resolve under our lint setup, so type the two calls we use.
const { evaluate, parse } = groq as unknown as {
  parse: (query: string) => unknown
  evaluate: (
    tree: unknown,
    options: { dataset: object[] },
  ) => Promise<{ get: () => Promise<unknown> }>
}

const link = (slug: string) => ({
  _type: 'link',
  linkType: 'internal',
  internal: { _type: 'reference', _ref: `page-${slug}` },
})
const navItem = (label: string, slug: string) => ({
  _key: label,
  _type: 'navItem',
  label,
  link: link(slug),
})
const pages = ['home', 'about'].map((slug) => ({
  _id: `page-${slug}`,
  _type: 'page',
  slug: { current: slug },
}))

const parts = {
  identity: { title: 'Acme', description: 'Hello', allowAiCrawlers: false },
  navigation: {
    headerNav: [navItem('Home', 'home')],
    headerCta: { _type: 'cta', label: 'Contact', variant: 'primary', link: link('about') },
    footerNav: [navItem('About', 'about')],
    footerText: 'Acme Ltd.',
  },
  announcement: { message: 'Sale', link: link('about'), dismissible: true },
  consent: { title: 'Cookies', privacyLabel: 'Privacy', privacyLink: link('about') },
}

/** The four singletons the Studio edits now. */
const singletons = [
  { _id: 'siteIdentity', _type: 'siteIdentity', ...parts.identity },
  { _id: 'siteNavigation', _type: 'siteNavigation', ...parts.navigation },
  { _id: 'announcement', _type: 'announcement', ...parts.announcement },
  { _id: 'cookieBanner', _type: 'cookieBanner', ...parts.consent },
]

/** The single document older datasets still hold until migrations/split-site-settings has run. */
const legacy = [
  {
    _id: 'settings',
    _type: 'settings',
    ...parts.identity,
    ...parts.navigation,
    announcement: { _type: 'announcement', ...parts.announcement },
    consent: { _type: 'consent', ...parts.consent },
  },
]

const run = async (dataset: object[]) =>
  (await evaluate(parse(SETTINGS_QUERY), { dataset: [...pages, ...dataset] })).get()

describe('SETTINGS_QUERY', () => {
  it('assembles the four singletons into the shape the site reads', async () => {
    expect(await run(singletons)).toMatchObject({
      title: 'Acme',
      description: 'Hello',
      allowAiCrawlers: false,
      headerNav: [{ label: 'Home', link: { linkType: 'internal', slug: 'home' } }],
      headerCta: { label: 'Contact', variant: 'primary', link: { slug: 'about' } },
      footerNav: [{ label: 'About' }],
      footerText: 'Acme Ltd.',
      announcement: { message: 'Sale', dismissible: true, link: { slug: 'about' } },
      consent: { title: 'Cookies', privacyLabel: 'Privacy', privacyLink: { slug: 'about' } },
    })
  })

  it('returns exactly what the old settings document returned, so either can be served', async () => {
    expect(await run(singletons)).toEqual(await run(legacy))
  })

  it('prefers the singletons once they exist', async () => {
    const edited = singletons.map((doc) =>
      doc._id === 'siteIdentity' ? { ...doc, title: 'Renamed' } : doc,
    )
    expect(await run([...legacy, ...edited])).toMatchObject({ title: 'Renamed' })
  })

  it('is null until any settings exist, like the old document read', async () => {
    expect(await run([])).toBeNull()
  })

  it('leaves unset parts empty, and allows AI crawlers unless switched off', async () => {
    expect(
      await run([{ _id: 'siteIdentity', _type: 'siteIdentity', title: 'Acme' }]),
    ).toMatchObject({
      title: 'Acme',
      announcement: null,
      consent: null,
      headerNav: null,
      allowAiCrawlers: true,
    })
  })
})
