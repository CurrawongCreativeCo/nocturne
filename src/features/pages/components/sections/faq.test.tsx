import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import { faq } from '../../schemas/sections/faq'
import {
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

async function draw(extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('faq', null)
  const raw = { ...seed, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}

const CARD = { border: 'thick', mark: { kind: 'icon', icon: 'heart' } }

describe('FAQ: the Divided list, the default', () => {
  it('is what an unset section draws: a ruled list of details, with no card', async () => {
    const unset = await draw()
    const explicit = await draw({ itemStyle: 'divided' })
    expect(explicit.body.innerHTML).toBe(unset.body.innerHTML)
    expect(unset.querySelector('.divide-y.divide-line')).not.toBeNull()
    expect(unset.querySelector('details')?.className).toBe('group py-5')
    expect(unset.querySelector('.rounded-card')).toBeNull()
  })

  it('draws no fill, border or mark, whatever is stored', async () => {
    const document = await draw({ cardDesign: CARD })
    expect(document.querySelector('.rounded-card')).toBeNull()
    expect(document.querySelector('[data-decorative-mark]')).toBeNull()
    expect(document.querySelector('.ring-3')).toBeNull()
  })

  it('takes the text roles', async () => {
    const document = await draw({
      cardDesign: { title: { size: 'large' }, body: { size: 'small' } },
    })
    expect(document.querySelector('[data-text-role="title"]')?.className).toContain('text-h4')
    expect(document.querySelector('[data-text-role="body"]')?.className).toContain('text-small')
  })
})

describe('FAQ: the Cards item style', () => {
  it('draws each question in its own card, and no ruled list', async () => {
    const document = await draw({ itemStyle: 'cards' })
    const cards = [...document.querySelectorAll('div.relative.rounded-card')]
    expect(cards.length).toBe(document.querySelectorAll('details').length)
    expect(cards.length).toBeGreaterThan(1)
    expect(document.querySelector('.divide-y')).toBeNull()
  })

  it('takes the fill, border and text roles', async () => {
    const document = await draw({
      itemStyle: 'cards',
      cardDesign: { border: 'thick', title: { weight: 'semibold' } },
    })
    const card = document.querySelector('div.relative.rounded-card')
    expect(card?.className).toContain('ring-3')
    expect(card?.querySelector('[data-text-role="title"]')?.className).toContain('font-semibold')
  })

  it('keeps the mark outside the <details>, so a closed question still shows it', async () => {
    const document = await draw({ itemStyle: 'cards', cardDesign: CARD })
    const mark = document.querySelector('[data-decorative-mark="card"]')
    expect(mark?.closest('details')).toBeNull()
    expect(mark?.parentElement?.querySelector(':scope > details')).not.toBeNull()
  })

  it('stays a native accordion', async () => {
    const document = await draw({ itemStyle: 'cards' })
    expect(document.querySelector('details > summary')).not.toBeNull()
    expect(document.querySelector('details')?.hasAttribute('open')).toBe(false)
  })
})

describe('FAQ’s Studio controls', () => {
  type Field = { name: string; hidden?: unknown; fields?: Field[] }
  const fields = faq.fields as unknown as Field[]
  const hiddenOn = (itemStyle: string | undefined, name: string) => {
    const field = fields
      .find((candidate) => candidate.name === 'cardDesign')
      ?.fields?.find((candidate) => candidate.name === name)
    return (field?.hidden as (context: unknown) => boolean)({
      document: { pageBuilder: [{ _key: 's', _type: 'faq', itemStyle }] },
      path: ['pageBuilder', { _key: 's' }, 'cardDesign', name],
    })
  }

  it('offers the fill, border and mark on Cards only', () => {
    for (const name of ['background', 'border', 'mark']) {
      expect(hiddenOn(undefined, name), `${name} when unset`).toBe(true)
      expect(hiddenOn('divided', name)).toBe(true)
      expect(hiddenOn('cards', name)).toBe(false)
    }
  })

  it('offers the text roles on every item style', () => {
    expect(hiddenOn(undefined, 'title')).toBe(false)
    expect(hiddenOn('cards', 'body')).toBe(false)
  })
})
