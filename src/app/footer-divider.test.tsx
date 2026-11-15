import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { siteNavigation } from '@/features/site/schemas/site-navigation'
import { parseHtml } from '@/lib/design/capability-harness'
import { isClientEditable } from '@/lib/sanity/client-editable'

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
 * The footer's divider (task 151): `navigation.footerDividerDesign`, drawn above the copyright and links row.
 * It replaces the fixed line directly above it, so the two are never both drawn.
 */
interface Field {
  name: string
  type: string
  group?: string
  hidden?: (context: unknown) => boolean
}
const LINE = { _type: 'decorativeDivider', style: 'line' }
const drawer = (() => {
  const found = VIEW_DRAWERS.siteFooter
  if (!found) throw new Error('no drawer for siteFooter')
  return found
})()

interface Setup {
  /** The social row: on with a business, or off. */
  social: boolean
  /** Business details above it. */
  business: boolean
}
const WITH_SOCIAL: Setup = { social: true, business: true }
const BUSINESS_ONLY: Setup = { social: false, business: true }
const NOTHING_ABOVE: Setup = { social: false, business: false }
const SETUPS: Record<string, Setup> = {
  'business details and a social row': WITH_SOCIAL,
  'business details, no social row': BUSINESS_ONLY,
  'nothing above the bottom row': NOTHING_ABOVE,
}

async function draw(setup: Setup, divider?: unknown) {
  const state = await drawer.seed()
  state.navigation = {
    ...(state.navigation as object),
    footerShowSocial: setup.social,
    ...(divider === undefined ? {} : { footerDividerDesign: divider }),
  }
  if (!setup.business) state.business = null
  const html = await drawer.draw(state)
  return { html, document: parseHtml(html) }
}

const TOP_RULE = 'border-t border-line'
const BUSINESS_RULE = 'border-b border-line'
const FOLLOWING = 4
const before = (a: Element | null, b: Element | null) =>
  Boolean(a && b && a.compareDocumentPosition(b) & FOLLOWING)

describe('the footer’s divider', () => {
  it.each(Object.entries(SETUPS))(
    'draws exactly as before while nothing is chosen: %s',
    async (_name, setup) => {
      const base = await draw(setup)
      expect(base.html).not.toContain('data-decorative-divider')
      for (const divider of [
        null,
        {},
        { _type: 'decorativeDivider' },
        { style: 'none' },
        { style: 'sparkly' },
      ]) {
        const same = await draw(setup, divider)
        expect(same.html, JSON.stringify(divider)).toBe(base.html)
      }
    },
  )

  it('keeps both fixed lines while nothing is chosen', async () => {
    const { document } = await draw(WITH_SOCIAL)
    expect(document.querySelector('footer')?.className).toContain(TOP_RULE)
    expect(document.querySelector('footer > div')?.className).toBe(BUSINESS_RULE)
  })

  it.each(Object.entries(SETUPS).filter(([, setup]) => setup.business || setup.social))(
    'sits above the bottom row, once, inside the footer: %s',
    async (_name, setup) => {
      const { document } = await draw(setup, LINE)
      const rules = document.querySelectorAll('[data-decorative-divider]')
      expect(rules).toHaveLength(1)
      const rule = rules[0] ?? null
      expect(rule?.closest('footer')).not.toBeNull()
      const copyright =
        [...document.querySelectorAll('footer p')].find((p) => p.textContent.includes('©')) ?? null
      expect(before(rule, copyright)).toBe(true)
      if (setup.social)
        expect(before(document.querySelector('[data-social-style]'), rule)).toBe(true)
      // In the footer's own content column, so it lines up with the text and starts where it starts.
      expect(rule?.parentElement?.className).toContain('max-w-content')
      expect(rule?.className).not.toContain('mx-auto')
    },
  )

  it('replaces the fixed line directly above it, and never shows both', async () => {
    // A social row sits between the business details and the divider, and has no line of its own:
    // the business block keeps its line and nothing is doubled.
    const withSocial = await draw(WITH_SOCIAL, LINE)
    expect(withSocial.document.querySelector('footer')?.className).toContain(TOP_RULE)
    expect(withSocial.document.querySelector('footer > div')?.className).toBe(BUSINESS_RULE)

    // Business details directly above: their bottom line yields, the footer's top edge stays.
    const business = await draw(BUSINESS_ONLY, LINE)
    expect(business.document.querySelector('footer')?.className).toContain(TOP_RULE)
    expect(business.html).not.toContain(BUSINESS_RULE)

    // The footer's top edge, against the page, is never the divider's to replace.
    for (const setup of [WITH_SOCIAL, BUSINESS_ONLY, NOTHING_ABOVE]) {
      const { document } = await draw(setup, LINE)
      expect(document.querySelector('footer')?.className).toContain(TOP_RULE)
    }
  })

  it('is not drawn with nothing above the bottom row: there is nothing for it to separate', async () => {
    const base = await draw(NOTHING_ABOVE)
    const chosen = await draw(NOTHING_ABOVE, LINE)
    expect(chosen.html).not.toContain('data-decorative-divider')
    // Byte-identical to the footer with none chosen, top border included.
    expect(chosen.html).toBe(base.html)
    expect(chosen.document.querySelector('footer')?.className).toContain(TOP_RULE)
  })

  it('gives the divider its own 24px and leaves the rows around it their padding', async () => {
    const { document } = await draw(BUSINESS_ONLY, LINE)
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.className).toContain('my-6')
    // Its margins stay inside the footer (a new formatting context), so nothing collapses out of it.
    expect(rule?.parentElement?.className).toContain('flow-root')
    // The bottom row is the same padded row it always was, so there is no margin to give up.
    const bottom = rule?.parentElement?.nextElementSibling
    expect(bottom?.className).toContain('py-12')
    expect(bottom?.className).not.toMatch(/\bm[tb]-/)
  })

  it('is decoration only: hidden from assistive technology, with nothing to tab to, and the links keep their order', async () => {
    const base = await draw(WITH_SOCIAL)
    const { document } = await draw(WITH_SOCIAL, LINE)
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('aria-hidden')).toBe('true')
    expect(rule?.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
    const links = (doc: Document) =>
      [...doc.querySelectorAll('footer a')].map((a) => a.getAttribute('href'))
    expect(links(document)).toEqual(links(base.document))
  })

  it('reads out words in its centre', async () => {
    const { document } = await draw(BUSINESS_ONLY, {
      ...LINE,
      centre: 'text',
      text: 'Find us',
    })
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('aria-hidden')).toBeNull()
    expect(rule?.textContent).toContain('Find us')
  })

  it('takes the footer’s tone, or a chosen line colour', async () => {
    const plain = await draw(BUSINESS_ONLY, LINE)
    expect(plain.document.querySelector('[data-decorative-divider]')?.className).toContain(
      'text-line-strong',
    )
    expect(plain.document.querySelector('footer')?.className).toContain('bg-surface-alt')
    const coloured = await draw(BUSINESS_ONLY, {
      ...LINE,
      lineColour: { colour: 'custom', hex: '#aa5500' },
    })
    const rule = coloured.document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('style')).toContain('color')
    expect(rule?.className).not.toContain('text-line-strong')
  })
})

describe('the footer’s divider field', () => {
  const field = (siteNavigation as unknown as { fields: Field[] }).fields.find(
    ({ name }) => name === 'footerDividerDesign',
  )
  const client = { currentUser: { roles: [{ name: 'editor' }] } }
  const agency = { currentUser: { roles: [{ name: 'administrator' }] } }

  it('is the shared divider type, in the Footer tab of Navigation', () => {
    expect(field?.type).toBe('decorativeDivider')
    expect(field?.group).toBe('footer')
  })

  it('is agency only: hidden from clients, and not a client-editable field', () => {
    expect(field?.hidden?.(client)).toBe(true)
    expect(field?.hidden?.(agency)).toBe(false)
    expect(isClientEditable('siteNavigation', 'footerDividerDesign')).toBe(false)
  })
})
