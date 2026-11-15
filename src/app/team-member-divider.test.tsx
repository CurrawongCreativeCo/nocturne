import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { teamPageSettings } from '@/features/team/schemas/team-page-settings'
import { parseHtml } from '@/lib/design/capability-harness'
import { AGENCY_ONLY_TYPES } from '@/lib/sanity/client-editable'

import { VIEW_DRAWERS } from './design-capability-views'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
}))
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

/**
 * The divider between a team member's summary and biography (task 151): `dividerDesign` in Team page
 * settings, drawn by the real member page through its drawer.
 */
const LINE = { _type: 'decorativeDivider', style: 'line' }
const drawer = (() => {
  const found = VIEW_DRAWERS.teamMemberPage
  if (!found) throw new Error('no drawer for teamMemberPage')
  return found
})()

const paragraph = (text: string, key = 'p') => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }],
})
const BIO = [paragraph('Ann has practised for twenty years.')]

async function draw(settings: Record<string, unknown> = {}, member: Record<string, unknown> = {}) {
  const state = await drawer.seed()
  state.member = { ...(state.member as object), bio: BIO, ...member }
  state.settings = { ...(state.settings as object), ...settings }
  const html = await drawer.draw(state)
  return { html, document: parseHtml(html) }
}
const withDivider = (divider: unknown) => ({ dividerDesign: divider })

const FOLLOWING = 4
const before = (a: Element | null, b: Element | null) =>
  Boolean(a && b && a.compareDocumentPosition(b) & FOLLOWING)
const bioOf = (document: Document) =>
  document.querySelector('article > div[class*="max-w-measure"]')

describe('the team member page’s divider', () => {
  it('draws exactly as before while nothing is chosen, however it is stored empty', async () => {
    const base = await draw()
    expect(base.html).not.toContain('data-decorative-divider')
    for (const divider of [
      undefined,
      null,
      {},
      { _type: 'decorativeDivider' },
      { style: 'none' },
      { style: 'sparkly' },
    ]) {
      const same = await draw(withDivider(divider))
      expect(same.html, JSON.stringify(divider)).toBe(base.html)
    }
  })

  it('keeps the biography’s original `mt-12` and the contact section’s own line while unset', async () => {
    const { document } = await draw()
    expect(bioOf(document)?.className).toContain('mt-12')
    expect(bioOf(document)?.className).not.toContain('[&>:first-child]:mt-0!')
    const contact = document.querySelector('section[aria-labelledby="contact-heading"]')
    expect(contact?.className).toBe('mt-12 border-t border-line pt-8')
  })

  it('sits between the summary and the biography, once, before the contact section', async () => {
    const { document } = await draw(withDivider(LINE))
    const rules = document.querySelectorAll('[data-decorative-divider]')
    expect(rules).toHaveLength(1)
    const rule = rules[0] ?? null
    expect(rule?.parentElement?.tagName).toBe('ARTICLE')
    expect(before(document.querySelector('h1'), rule)).toBe(true)
    expect(before(document.querySelector('header'), rule)).toBe(true)
    expect(before(rule, bioOf(document))).toBe(true)
    expect(before(rule, document.querySelector('#contact-heading'))).toBe(true)
    // Starts where the page's text starts, not centred.
    expect(rule?.className).not.toContain('mx-auto')
  })

  it('gives the divider the space: the biography and its first block drop their top margin', async () => {
    const { document } = await draw(withDivider(LINE))
    const bio = bioOf(document)
    expect(bio?.className).toContain('mt-0')
    expect(bio?.className).toContain('[&>:first-child]:mt-0!')
    expect(bio?.className).not.toContain('mt-12')
    expect(document.querySelector('[data-decorative-divider]')?.className).toContain('my-6')
  })

  it('leaves the contact section’s own line untouched with a divider', async () => {
    const { document } = await draw(withDivider(LINE))
    const contact = document.querySelector('section[aria-labelledby="contact-heading"]')
    expect(contact?.className).toBe('mt-12 border-t border-line pt-8')
  })

  it('is not drawn for a member with no biography, or one that says nothing', async () => {
    for (const bio of [null, [], [paragraph('')], [paragraph('   ', 'a'), paragraph('', 'b')]]) {
      const base = await draw({}, { bio })
      const chosen = await draw(withDivider(LINE), { bio })
      expect(chosen.html, JSON.stringify(bio)).not.toContain('data-decorative-divider')
      // Byte-identical to the page with none chosen, whatever the biography was.
      expect(chosen.html, JSON.stringify(bio)).toBe(base.html)
    }
  })

  it('is drawn when the biography is only a picture', async () => {
    const picture = {
      _type: 'image',
      _key: 'bi',
      alt: 'Inline',
      asset: {
        _type: 'reference',
        _ref: 'image-0123456789abcdef0123456789abcdef01234567-1200x630-png',
      },
    }
    const { document } = await draw(withDivider(LINE), { bio: [picture] })
    expect(document.querySelectorAll('[data-decorative-divider]')).toHaveLength(1)
  })

  it('is decoration: hidden from assistive technology, nothing to tab to, and the headings keep their order', async () => {
    const base = await draw()
    const { document } = await draw(withDivider(LINE))
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('aria-hidden')).toBe('true')
    expect(rule?.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
    const outline = (doc: Document) =>
      [...doc.querySelectorAll('h1, h2, h3, a')].map((node) => node.textContent)
    expect(outline(document)).toEqual(outline(base.document))
  })

  it('reads out words in its centre', async () => {
    const { document } = await draw(withDivider({ ...LINE, centre: 'text', text: 'About Ann' }))
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('aria-hidden')).toBeNull()
    expect(rule?.textContent).toContain('About Ann')
  })

  it('takes the page’s tone, or a chosen line colour', async () => {
    const plain = await draw(withDivider(LINE))
    expect(plain.document.querySelector('[data-decorative-divider]')?.className).toContain(
      'text-line-strong',
    )
    const coloured = await draw(
      withDivider({ ...LINE, lineColour: { colour: 'custom', hex: '#aa5500' } }),
    )
    const rule = coloured.document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('style')).toContain('color')
    expect(rule?.className).not.toContain('text-line-strong')
  })
})

describe('the Team page settings divider field', () => {
  interface Field {
    name: string
    type: string
    group?: string
    hidden?: (context: unknown) => boolean
  }
  const field = (teamPageSettings as unknown as { fields: Field[] }).fields.find(
    ({ name }) => name === 'dividerDesign',
  )
  const client = { currentUser: { roles: [{ name: 'editor' }] } }
  const agency = { currentUser: { roles: [{ name: 'administrator' }] } }

  it('is the shared divider type, in the Design tab', () => {
    expect(field?.type).toBe('decorativeDivider')
    expect(field?.group).toBe('design')
  })

  it('is agency only: the document is, and the field is hidden from clients', () => {
    expect(AGENCY_ONLY_TYPES.has('teamPageSettings')).toBe(true)
    expect(field?.hidden?.(client)).toBe(true)
    expect(field?.hidden?.(agency)).toBe(false)
  })

  it('has no initial value', () => {
    expect(field).not.toHaveProperty('initialValue')
  })
})
