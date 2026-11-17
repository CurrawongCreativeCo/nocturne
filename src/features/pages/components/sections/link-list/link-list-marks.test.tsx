import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  fixtureDocuments,
  gallerySeed,
  projectSections,
  renderSections,
  stableOutput,
} from '@/features/pages/components/section-renderer.fixtures'
import type { Patch } from '@/lib/design/capability-evidence'
import { parseHtml } from '@/lib/design/capability-harness'
import { applyPatch } from '@/lib/design/capability-patch'

/**
 * The Link list's decorative marks and its Appearance switch (task 156), on every layout and on a Glass
 * row: a card mark and an item mark are separate choices, an item's choice reaches that link only, and
 * a mark adds nothing to what the card is, which is one link with the name it always had.
 */

vi.setConfig({ testTimeout: 30_000 })

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

const fixtureLink = (key: string, link: Record<string, unknown>) => ({
  _key: key,
  _type: 'linkListItem',
  eyebrow: 'Eyebrow',
  label: `Link ${key}`,
  description: 'A short description.',
  link,
})
const external = (key: string) => ({
  _type: 'link',
  linkType: 'external',
  url: `https://example.com/${key}`,
})
const CONTENT: Patch = {
  links: [fixtureLink('one', external('one')), fixtureLink('two', external('two'))],
}

const CARD_MARK = { kind: 'text', text: 'Card' }
const ITEM_MARK = { kind: 'icon', icon: 'heart' }
const LOOKS = [
  { name: 'stacked', layout: 'stacked', look: {} },
  { name: 'cards', layout: 'cards', look: {} },
  { name: 'editorial', layout: 'editorial', look: {} },
  { name: 'compact', layout: 'compact', look: {} },
  { name: 'stacked, Glass rows', layout: 'stacked', look: { rowStyle: 'glass' } },
] as const

async function html(layout: string, patch: Patch): Promise<string> {
  const seed = await gallerySeed('linkList', layout)
  const raw = applyPatch(applyPatch(seed, CONTENT), patch)
  return renderSections(await projectSections([raw]), { belowHeading: true })
}

/** What a visitor gets from each link of the section. */
async function links(layout: string, patch: Patch) {
  const page = parseHtml(await html(layout, patch))
  return [...page.querySelectorAll('li[data-track-event="link_click"]')].map((item) => {
    const marks = [...item.querySelectorAll<HTMLElement>('[data-decorative-mark]')]
    const controls = item.querySelectorAll('a, button')
    const control = controls[0]
    const named = control?.cloneNode(true) as Element | undefined
    named?.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
      hidden.remove()
    })
    return {
      scopes: marks.map((mark) => mark.getAttribute('data-decorative-mark')),
      kinds: marks.map((mark) => mark.getAttribute('data-mark-kind')),
      elements: marks.map((mark) => mark.tagName),
      hidden: marks.map((mark) => mark.getAttribute('aria-hidden')),
      inControl: marks.map((mark) => mark.closest('a, button') === control),
      focusableInMark: marks.flatMap((mark) => [
        ...mark.querySelectorAll('a, button, input, [tabindex]'),
      ]).length,
      controls: controls.length,
      controlTag: control?.tagName,
      href: control?.getAttribute('href'),
      name: named?.textContent.trim(),
      isolated: control?.className.includes('isolate'),
      html: stableOutput(item.outerHTML),
    }
  })
}

const custom = (design: Patch) => ({ 'links.0.design': { appearance: 'custom', ...design } })

describe.each(LOOKS)('marks on $name', ({ layout, look }) => {
  it('draws nothing while no mark is chosen, and leaves the link as it was', async () => {
    const [first, second] = await links(layout, look)
    expect(first?.scopes).toEqual([])
    expect(second?.scopes).toEqual([])
    expect(first?.isolated).toBe(false)
  })

  it('a card mark reaches every link, and an item mark nothing', async () => {
    const drawn = await links(layout, { ...look, 'cardDesign.mark': CARD_MARK })
    expect(drawn.map(({ scopes }) => scopes)).toEqual([['card'], ['card']])
    expect(drawn.map(({ kinds }) => kinds)).toEqual([['text'], ['text']])
  })

  it('an item mark reaches its own link only, with no card mark chosen', async () => {
    const drawn = await links(layout, { ...look, ...custom({ mark: ITEM_MARK }) })
    expect(drawn.map(({ scopes }) => scopes)).toEqual([['item'], []])
    expect(drawn[0]?.kinds).toEqual(['icon'])
  })

  it('an item mark replaces the card mark on its link, and leaves the others theirs', async () => {
    const drawn = await links(layout, {
      ...look,
      'cardDesign.mark': CARD_MARK,
      ...custom({ mark: ITEM_MARK }),
    })
    expect(drawn.map(({ scopes }) => scopes)).toEqual([['item'], ['card']])
  })

  it('an item that chooses None has no mark, and the others keep the card’s', async () => {
    const drawn = await links(layout, {
      ...look,
      'cardDesign.mark': CARD_MARK,
      ...custom({ mark: { kind: 'none' } }),
    })
    expect(drawn.map(({ scopes }) => scopes)).toEqual([[], ['card']])
  })

  it('an item’s saved mark does nothing until its Appearance is customised', async () => {
    const saved = { 'links.0.design': { mark: ITEM_MARK, border: 'thick' } }
    const [off, plain] = await Promise.all([
      links(layout, { ...look, ...saved }),
      links(layout, look),
    ])
    expect(off.map(({ scopes }) => scopes)).toEqual([[], []])
    expect(off.map((link) => link.html)).toEqual(plain.map((link) => link.html))
  })

  it('a link keeps its one control, address and name, and the mark is hidden and inert', async () => {
    const [plain, marked] = await Promise.all([
      links(layout, look),
      links(layout, { ...look, 'cardDesign.mark': CARD_MARK, ...custom({ mark: ITEM_MARK }) }),
    ])
    for (const [index, link] of marked.entries()) {
      expect(link.controls).toBe(1)
      expect(link.href).toBe(plain[index]?.href)
      expect(link.name).toBe(plain[index]?.name)
      expect(link.hidden).toEqual(['true'])
      expect(link.inControl).toEqual([true])
      expect(link.elements).toEqual(['SPAN'])
      expect(link.focusableInMark).toBe(0)
      expect(link.isolated).toBe(true)
    }
  })

  it('a link that opens a panel holds its mark in phrasing content', async () => {
    const documents = await fixtureDocuments()
    const panel = documents.find(({ _type }) => _type === 'panel')
    const [drawn] = await links(layout, {
      ...look,
      links: [
        fixtureLink('one', {
          _type: 'link',
          linkType: 'panel',
          panel: { _type: 'reference', _ref: panel?._id },
        }),
      ],
      'cardDesign.mark': CARD_MARK,
    })
    expect(drawn?.controlTag).toBe('BUTTON')
    expect(drawn?.elements).toEqual(['SPAN'])
    expect(drawn?.inControl).toEqual([true])
  })
})

describe('Appearance, as the shared switch', () => {
  it.each(LOOKS)(
    '$name: unset and “use the list’s design” draw the same',
    async ({ layout, look }) => {
      const [unset, list] = await Promise.all([
        links(layout, look),
        links(layout, { ...look, 'links.0.design': { appearance: 'list' } }),
      ])
      expect(list.map((link) => link.html)).toEqual(unset.map((link) => link.html))
    },
  )

  it.each(LOOKS)(
    '$name: customising with nothing chosen changes nothing',
    async ({ layout, look }) => {
      const [unset, empty] = await Promise.all([
        links(layout, look),
        links(layout, { ...look, ...custom({}) }),
      ])
      expect(empty.map((link) => link.html)).toEqual(unset.map((link) => link.html))
    },
  )
})

describe('inheritance from the section to the card to the item', () => {
  const LABEL = (colour: string) => ({ label: { colour: { colour } } })

  it.each(['stacked', 'cards', 'editorial', 'compact'])(
    '%s: the card box reaches every link, and an item’s choice only its own',
    async (layout) => {
      const [plain, card, item] = await Promise.all([
        links(layout, {}),
        links(layout, { cardDesign: LABEL('accent') }),
        links(layout, { cardDesign: LABEL('accent'), ...custom(LABEL('highlight')) }),
      ])
      expect(card[0]?.html).not.toBe(plain[0]?.html)
      expect(card[1]?.html).not.toBe(plain[1]?.html)
      expect(item[0]?.html).not.toBe(card[0]?.html)
      expect(item[1]?.html).toBe(card[1]?.html)
    },
  )

  it('a section’s tone changes the card’s mark measure, not which mark is drawn', async () => {
    const drawn = await links('cards', {
      'style.tone': 'inverse',
      'cardDesign.mark': CARD_MARK,
    })
    expect(drawn.map(({ scopes }) => scopes)).toEqual([['card'], ['card']])
  })
})

describe('one customised link leaves the others alone', () => {
  // Border, text size and a mark together, so a leak of any of them shows. Compared with the same list
  // with nothing customised, so what the second link drew before is exactly what it draws after.
  const OWN = { border: 'thick', label: { size: 'large' }, mark: ITEM_MARK }
  const at = (index: number) => ({
    [`links.${String(index)}.design`]: { appearance: 'custom', ...OWN },
  })

  it.each(LOOKS)(
    '$name: customising either link changes that link only',
    async ({ layout, look }) => {
      const [plain, first, second] = await Promise.all([
        links(layout, look),
        links(layout, { ...look, ...at(0) }),
        links(layout, { ...look, ...at(1) }),
      ])
      expect(first[0]?.html).not.toBe(plain[0]?.html)
      expect(first[1]?.html).toBe(plain[1]?.html)
      expect(second[1]?.html).not.toBe(plain[1]?.html)
      expect(second[0]?.html).toBe(plain[0]?.html)
    },
  )
})

describe('a ruled Editorial row', () => {
  it('measures its mark on the section, whatever fill a box has stored', async () => {
    const mark = { kind: 'text', text: 'Card', opacity: 30 }
    const fill = { background: { colour: 'ink' }, strength: 'solid' }
    const [plain, stored] = await Promise.all([
      links('editorial', { 'cardDesign.mark': mark }),
      links('editorial', { cardDesign: { mark, ...fill } }),
    ])
    expect(stored.map((link) => link.html)).toEqual(plain.map((link) => link.html))
  })
})
