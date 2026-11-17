// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { resolveEmbed } from '@/config/embed-providers'

import type { PageSection } from '../types'
import { SectionRenderer } from './section-renderer'

vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

/**
 * What the visibility advisory may take as drawn (task 151, Slice 8). It assesses the layer below an edge only
 * over a following section it has established draws its background: these are the renderer's own facts, checked
 * against the real SectionRenderer with the least data a stored section can have. A type that always draws its
 * frame shows a <section> in its stored tone; the cases the advisory refuses (a form with no form, a pricing
 * table with no plans, an embed the page cannot draw) show none. `presenceOf` in schema/section-form.ts must
 * agree with this file; change one and the other fails.
 */

const draw = (section: object) => {
  const html = renderToStaticMarkup(
    createElement(SectionRenderer, {
      documentId: 'p',
      documentType: 'page',
      sections: [{ _key: 'x', access: null, ...section } as unknown as PageSection],
    }),
  )
  document.body.innerHTML = `<main>${html}</main>`
  return document.querySelector('section')
}
const style = (tone: string) => ({ anchorId: 'x', tone })

describe('sections that always draw their frame in the stored tone', () => {
  const MINIMAL: Record<string, object> = {
    richText: { body: [] },
    featuresGrid: { items: [], columns: 3 },
    ctaBanner: { ctas: [], tone: 'dark' },
    newsletterSignup: {},
  }
  for (const [type, data] of Object.entries(MINIMAL))
    for (const tone of ['alt', 'inverse', 'accent'])
      it(`draws a ${tone} ${type} with nothing in it`, () => {
        const section = draw({ _type: type, style: style(tone), ...data })
        expect(section, type).toBeTruthy()
        expect(section?.getAttribute('data-tone')).toBe(tone)
      })

  it('draws an embed only when the page can resolve its address, with the same guard the advisory uses', () => {
    const good = { provider: 'typeform', url: 'https://form.typeform.com/to/abcd1234' }
    expect(resolveEmbed(good.provider, good.url)).toBeDefined()
    expect(draw({ _type: 'embed', style: style('inverse'), ...good })).toBeTruthy()
    for (const bad of [{}, { provider: 'typeform', url: 'https://evil.test/to/abcd1234' }]) {
      expect(
        resolveEmbed((bad as { provider?: string }).provider, (bad as { url?: string }).url),
      ).toBeUndefined()
      expect(draw({ _type: 'embed', style: style('inverse'), ...bad })).toBeNull()
    }
  })
})

describe('sections that can draw nothing', () => {
  it('draws no section for a form section with no form, or a dangling one, whatever the tone', () => {
    for (const tone of ['inverse', 'accent']) {
      expect(draw({ _type: 'formSection', style: style(tone) })).toBeNull()
      expect(draw({ _type: 'formSection', style: style(tone), form: null })).toBeNull()
    }
  })

  it('draws no section for a pricing table with no plans', () => {
    expect(draw({ _type: 'pricingTable', style: style('inverse'), plans: [] })).toBeNull()
  })
})
