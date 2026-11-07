import { readFileSync } from 'node:fs'

import * as groq from 'groq-js'
import { describe, expect, it } from 'vitest'

import { panelRefsFragment } from './sections'

// groq-js 2's type declarations don't resolve under our lint setup, so type the two calls we use.
const { evaluate, parse } = groq as unknown as {
  parse: (query: string, options: { params: Record<string, unknown> }) => unknown
  evaluate: (
    tree: unknown,
    options: { dataset: object[]; params: Record<string, unknown> },
  ) => Promise<{ get: () => Promise<unknown> }>
}

const source = readFileSync(new URL('./sections.ts', import.meta.url), 'utf8')

const fieldsUsing = (fragment: 'ctaFields' | 'portableTextFields') =>
  [...source.matchAll(new RegExp(`(\\w+)\\[\\] \\{ \\$\\{${fragment}\\} \\}`, 'g'))].map(
    (match) => match[1] ?? '',
  )

/**
 * PAGE_QUERY fetches the panels a page's buttons open by listing where such a link can sit
 * (panelRefsFragment). A section that gains links somewhere new must be added there, or its panel
 * button would silently fall back to its URL.
 */
describe('panelRefsFragment', () => {
  it('finds the panel in every place a section keeps buttons', () => {
    const fields = fieldsUsing('ctaFields')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) expect(panelRefsFragment).toContain(`.${field}[].link.panel._ref`)
  })

  it('finds the panel in every link field a section projects with the shared link fields', () => {
    const fields = [...source.matchAll(/(\w+) \{ \$\{linkFields\} \}/g)].map(
      (match) => match[1] ?? '',
    )
    expect(fields).toContain('seeAllLink')
    // A link inside an array (`links[].link`, `ctas[].link`) is covered by the cases for those arrays.
    for (const field of fields.filter((name) => name !== 'link')) {
      expect(panelRefsFragment).toContain(`.${field}.panel._ref`)
    }
  })

  it('finds the panel in every place a section keeps rich text', () => {
    const fields = fieldsUsing('portableTextFields')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields)
      expect(panelRefsFragment).toContain(`${field}[].markDefs[].panel._ref`)
  })

  describe('a Link list’s links', () => {
    const panels: object[] = ['enquire', 'hours', 'story'].map((name) => ({
      _id: name,
      _type: 'panel',
    }))
    const linkTo = (panel: string, extra: Record<string, unknown> = {}) => ({
      _key: panel,
      link: { linkType: 'panel', panel: { _type: 'reference', _ref: panel } },
      ...extra,
    })
    const list = (links: unknown[], extra: Record<string, unknown> = {}) => ({
      _key: 'list',
      _type: 'linkList',
      links,
      ...extra,
    })
    const panelsOn = async (pageBuilder: unknown[], members = false, more: object[] = []) => {
      const tree = parse(
        `*[_id == "page"][0]{ "panels": *[_type == "panel" && _id in (${panelRefsFragment})]._id }`,
        { params: { members } },
      )
      const result = await evaluate(tree, {
        dataset: [{ _id: 'page', _type: 'page', pageBuilder }, ...panels, ...more],
        params: { members },
      })
      return ((await result.get()) as { panels: string[] }).panels
    }

    it('brings the panels its links open onto the page', async () => {
      expect(await panelsOn([list([linkTo('enquire'), linkTo('hours')])])).toEqual([
        'enquire',
        'hours',
      ])
    })

    it('brings them from a shared section too', async () => {
      const shared = { _id: 'shared', _type: 'sharedSection', section: [list([linkTo('story')])] }
      const reference = { _key: 'ref', _type: 'reference', _ref: 'shared' }
      expect(await panelsOn([reference], false, [shared])).toEqual(['story'])
    })

    it('leaves out a panel only a hidden link opens', async () => {
      const links = [linkTo('enquire', { visibility: 'hide' }), linkTo('hours')]
      expect(await panelsOn([list(links)])).toEqual(['hours'])
    })

    it('leaves out a members-only list’s panels until the visitor is a member', async () => {
      const section = list([linkTo('enquire')], { access: 'members' })
      expect(await panelsOn([section])).toEqual([])
      expect(await panelsOn([section], true)).toEqual(['enquire'])
    })

    it('adds nothing to a page whose links open no panel', async () => {
      const link = { _key: 'web', link: { linkType: 'external', url: 'https://example.com' } }
      expect(await panelsOn([list([link])])).toEqual([])
    })
  })

  describe('the Events section’s “See all” link', () => {
    const events = (seeAllLink: unknown, extra: Record<string, unknown> = {}) => ({
      _key: 'events',
      _type: 'events',
      seeAllLink,
      ...extra,
    })
    const open = (panel: string) => ({
      linkType: 'panel',
      panel: { _type: 'reference', _ref: panel },
    })
    const panelsOn = async (pageBuilder: unknown[], members = false, more: object[] = []) => {
      const tree = parse(
        `*[_id == "page"][0]{ "panels": *[_type == "panel" && _id in (${panelRefsFragment})]._id }`,
        { params: { members } },
      )
      const result = await evaluate(tree, {
        dataset: [
          { _id: 'page', _type: 'page', pageBuilder },
          { _id: 'hours', _type: 'panel' },
          { _id: 'story', _type: 'panel' },
          ...more,
        ],
        params: { members },
      })
      return ((await result.get()) as { panels: string[] }).panels
    }

    it('brings the panel it opens onto the page', async () => {
      expect(await panelsOn([events(open('hours'))])).toEqual(['hours'])
    })

    it('brings it from a shared section too', async () => {
      const shared = { _id: 'shared', _type: 'sharedSection', section: [events(open('story'))] }
      const reference = { _key: 'ref', _type: 'reference', _ref: 'shared' }
      expect(await panelsOn([reference], false, [shared])).toEqual(['story'])
    })

    it('leaves out a members-only section’s panel until the visitor is a member', async () => {
      const section = events(open('hours'), { access: 'members' })
      expect(await panelsOn([section])).toEqual([])
      expect(await panelsOn([section], true)).toEqual(['hours'])
    })

    it('adds nothing when the link goes to a website, or is not set', async () => {
      const web = { linkType: 'external', url: 'https://example.com' }
      expect(await panelsOn([events(web), events(undefined, { _key: 'other' })])).toEqual([])
    })
  })

  it('reads shared sections too, and leaves out members-only sections until the visitor is a member', () => {
    expect(panelRefsFragment).toContain('->section[access != "members" || $members]')
    expect(panelRefsFragment).toContain('^.pageBuilder[access != "members" || $members]')
  })
})
