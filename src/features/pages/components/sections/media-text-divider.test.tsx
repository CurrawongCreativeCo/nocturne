import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../section-renderer.fixtures'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
}))
vi.mock('next/dynamic', async () => {
  const { lazy } = await import('react')
  return {
    default: (load: () => Promise<unknown>) =>
      lazy(async () => {
        const loaded = (await load()) as { default?: ComponentType } | undefined
        return { default: (loaded?.default ?? loaded) as ComponentType }
      }),
  }
})
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const LAYOUTS = ['side', 'stacked', 'overlay'] as const
const LINE = { _type: 'decorativeDivider', style: 'line' }

const paragraph = (text: string, key = 'p') => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }],
})
const BODY = [paragraph('Body text under the divider.')]

/** Image + text at a layout (a picture in its media slot, so every layout is drawn as named). */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('mediaText', layout)
  const picture = {
    _type: 'image',
    alt: 'A studio',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  }
  const raw = {
    ...seed,
    variant: layout,
    eyebrow: null,
    title: 'A title',
    heading: null,
    body: BODY,
    ctas: null,
    image: null,
    imageDesign: null,
    pictureDepthDesign: null,
    supporting: null,
    media: [{ _key: 'm', _type: 'slotImage', image: picture }],
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}
const withDivider = (divider: unknown, extra: Record<string, unknown> = {}) => ({
  headerDesign: { _type: 'object', divider },
  ...extra,
})

/** DOCUMENT_POSITION_FOLLOWING: there is no `Node` global in this environment. */
const FOLLOWING = 4
const before = (a: Element | null, b: Element | null) =>
  Boolean(a && b && a.compareDocumentPosition(b) & FOLLOWING)

describe.each(LAYOUTS)('Image + text, %s: divider (task 151)', (layout) => {
  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    const base = await draw(layout)
    expect(base.html).not.toContain('data-decorative-divider')
    for (const divider of [
      undefined,
      null,
      {},
      { _type: 'decorativeDivider' },
      { style: 'none' },
      { style: 'sparkly' },
    ]) {
      const same = await draw(layout, withDivider(divider))
      expect(same.html, JSON.stringify(divider)).toBe(base.html)
    }
  })

  it('sits between the heading and the body, once, inside the text', async () => {
    const { document } = await draw(layout, withDivider(LINE))
    const rules = document.querySelectorAll('[data-decorative-divider]')
    expect(rules).toHaveLength(1)
    const rule = rules[0] ?? null
    const body = document.querySelector('[data-text-role="intro"]')
    expect(before(document.querySelector('h2'), rule)).toBe(true)
    expect(before(rule, body)).toBe(true)
    // The same container as the heading and the body, so it is never drawn beside the picture.
    expect(rule?.parentElement).toBe(document.querySelector('h2')?.parentElement)
    expect(rule?.parentElement).toBe(body?.parentElement)
  })

  it('is not drawn with no title, however much follows', async () => {
    for (const extra of [{ title: '' }, { title: '   ' }]) {
      const { html } = await draw(layout, withDivider(LINE, extra))
      expect(html, JSON.stringify(extra)).not.toContain('data-decorative-divider')
    }
  })

  it('is not drawn with no body, an empty body or one of blank paragraphs', async () => {
    for (const body of [null, [], [paragraph('')], [paragraph('   ', 'a'), paragraph('', 'b')]]) {
      const { html } = await draw(layout, withDivider(LINE, { body }))
      expect(html, JSON.stringify(body)).not.toContain('data-decorative-divider')
    }
  })

  it('is drawn when the body is only a picture', async () => {
    const picture = {
      _type: 'image',
      _key: 'bi',
      alt: 'Inline',
      asset: { _type: 'reference', _ref: await fixturePictureId() },
    }
    const { document } = await draw(layout, withDivider(LINE, { body: [picture] }))
    expect(document.querySelectorAll('[data-decorative-divider]')).toHaveLength(1)
  })

  it('gives the divider the space: the body and its first block drop their top margin', async () => {
    const { document } = await draw(layout, withDivider(LINE))
    const body = document.querySelector('[data-text-role="intro"]')
    expect(body?.className).toContain('mt-0')
    expect(body?.className).toContain('[&>:first-child]:mt-0!')
    expect(body?.className).not.toContain('mt-4')
    // Buttons keep their own gap below the body.
    const withButtons = await draw(
      layout,
      withDivider(LINE, {
        ctas: [{ _key: 'c', label: 'Read more', variant: 'primary', link: { _type: 'link' } }],
      }),
    )
    expect(withButtons.document.querySelector('[data-text-role="intro"]')?.className).toContain(
      'mt-0',
    )
  })

  it('keeps every original margin while nothing is chosen', async () => {
    const { document } = await draw(layout)
    const body = document.querySelector('[data-text-role="intro"]')
    expect(body?.className).toContain('mt-4')
    expect(body?.className).not.toContain('[&>:first-child]:mt-0!')
  })

  it('is hidden from assistive technology as a plain rule, and read when it has words', async () => {
    const plain = await draw(layout, withDivider(LINE))
    expect(
      plain.document.querySelector('[data-decorative-divider]')?.getAttribute('aria-hidden'),
    ).toBe('true')
    const words = await draw(
      layout,
      withDivider({
        _type: 'decorativeDivider',
        style: 'line',
        centre: 'text',
        text: 'Our story',
      }),
    )
    const rule = words.document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('aria-hidden')).toBeNull()
    expect(rule?.textContent).toContain('Our story')
  })

  it('keeps a chosen line colour', async () => {
    const { document } = await draw(
      layout,
      withDivider({ ...LINE, lineColour: { colour: 'custom', hex: '#aa5500' } }),
    )
    const rule = document.querySelector('[data-decorative-divider]')
    expect(rule?.getAttribute('style')).toContain('color')
    expect(rule?.className).not.toContain('text-line-strong')
  })
})

describe('Image + text: where the divider starts and its tone', () => {
  it('centres in Stacked (a centred layout) and starts in Side and Full background', async () => {
    const stacked = await draw('stacked', withDivider(LINE))
    expect(stacked.document.querySelector('[data-decorative-divider]')?.className).toContain(
      'mx-auto',
    )
    for (const layout of ['side', 'overlay']) {
      const { document } = await draw(layout, withDivider(LINE))
      expect(document.querySelector('[data-decorative-divider]')?.className, layout).not.toContain(
        'mx-auto',
      )
    }
    // A section set to centre centres it in any layout.
    const centred = await draw(
      'side',
      withDivider(LINE, { style: { _type: 'sectionStyle', align: 'center' } }),
    )
    expect(centred.document.querySelector('[data-decorative-divider]')?.className).toContain(
      'mx-auto',
    )
  })

  it('takes the section’s tone: the default line colour is a tone token, inside the tone’s element', async () => {
    for (const layout of LAYOUTS) {
      const { document } = await draw(layout, withDivider(LINE))
      const rule = document.querySelector('[data-decorative-divider]')
      expect(rule?.className, layout).toContain('text-line-strong')
      expect(rule?.closest('[data-tone]'), layout).not.toBeNull()
    }
    // Full background is dark by default, and its picture sits behind the text, not in the divider's way.
    const overlay = await draw('overlay', withDivider(LINE))
    expect(overlay.document.querySelector('section')?.getAttribute('data-tone')).toBe('inverse')
  })
})
