import { vercelStegaCombine } from '@vercel/stega'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { sectionTypes } from '../schemas/sections'
import type { FullSection, PageSection, SectionGate } from '../types'
import {
  fingerprint,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from './section-renderer.fixtures'

/**
 * Output parity for every section, layout and stored panel choice, in public pages, draft mode and
 * behind the members gate. The fingerprints were captured before task 275 moved the "draws its own
 * surfaces" rule into SectionRenderer; they must not change unless a section's output is meant to.
 * When one is (a deliberate design change), update the snapshot with `npx vitest -u` and say why in
 * the pull request. `panel` records what each case draws, so a reviewer can read the behaviour.
 */

// The fixtures' event dates are relative to today, so today is fixed before anything imports them.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})

// Pictures need Next's image runtime: a plain <img> keeps the URL and classes.
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: '',
    }),
}))
// Lazy client parts render on the server in Next; React.lazy does the same here.
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
// A section with a panel reads the site's colours; none are stored in a unit test.
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

type PanelState = 'unset' | 'none' | 'glass' | 'solid'
const PANELS: readonly PanelState[] = ['unset', 'none', 'glass', 'solid']

/** Layout values from each section's `variant` field, or `[null]` for a section with one layout. */
const layoutsOf = (type: string): (string | null)[] => {
  const definition = sectionTypes.find((section) => section.name === type) as
    | { fields?: { name: string; options?: { list?: ({ value?: string } | string)[] } }[] }
    | undefined
  const list = definition?.fields?.find((field) => field.name === 'variant')?.options?.list
  return list?.length
    ? list.map((entry) => (typeof entry === 'string' ? entry : (entry.value ?? '')))
    : [null]
}

const withPanel = (section: RawSection, panel: PanelState): RawSection => {
  const {
    panel: _panel,
    panelStrength: _strength,
    ...style
  } = (section.style as Record<string, unknown> | undefined) ?? {}
  return {
    ...section,
    style: panel === 'unset' ? style : { ...style, panel, panelStrength: 'strong' },
  }
}

/** What the output draws for its panel: the `data-panel` value, or null for none. */
const panelOf = (html: string) => /data-panel="([^"]+)"/.exec(html)?.[1] ?? null

async function caseOf(raw: RawSection, options?: Parameters<typeof renderSections>[1]) {
  const html = await renderSections(await projectSections([raw]), options)
  return { hash: fingerprint(html), panel: panelOf(html) }
}

/** The sections that draw their own surfaces on some layout, plus two that never do. */
const DRAFT_AND_GATE_CASES: readonly [type: string, layout: string | null][] = [
  ['hero', 'full-bleed'],
  ['hero', 'split'],
  ['ctaBanner', null],
  ['linkList', 'stacked'],
  ['linkList', 'compact'],
  ['mediaText', 'side'],
  ['richText', null],
]

const stega = (value: string) =>
  vercelStegaCombine(value, { origin: 'sanity.io', href: '/studio/intent/edit/id=fixture-page' })

describe('SectionRenderer output parity', () => {
  it.each(sectionTypes.map((section) => section.name))(
    '%s keeps its output for every layout and stored panel choice',
    async (type) => {
      const cases: Record<string, { hash: string; panel: string | null }> = {}
      for (const layout of layoutsOf(type)) {
        const seed = await gallerySeed(type, layout)
        for (const panel of PANELS) {
          cases[`${layout ?? 'single layout'} · panel ${panel}`] = await caseOf(
            withPanel(seed, panel),
          )
        }
      }
      expect(cases).toMatchSnapshot()
    },
  )

  it('keeps draft-mode output, with edit markers in the layout and panel values', async () => {
    const cases: Record<string, { hash: string; panel: string | null }> = {}
    for (const [type, layout] of DRAFT_AND_GATE_CASES) {
      const [projected] = await projectSections([
        withPanel(await gallerySeed(type, layout), 'glass'),
      ])
      const section = projected as PageSection & {
        variant?: string | null
        style?: Record<string, unknown> | null
      }
      const encoded = {
        ...section,
        ...(typeof section.variant === 'string' ? { variant: stega(section.variant) } : {}),
        style: { ...section.style, panel: stega('glass') },
      } as PageSection
      const html = await renderSections([encoded], { editable: true })
      cases[`${type} · ${layout ?? 'single layout'}`] = {
        hash: fingerprint(html),
        panel: panelOf(html),
      }
    }
    expect(cases).toMatchSnapshot()
  })

  it('keeps output behind the members gate', async () => {
    const cases: Record<string, { hash: string; panel: string | null }> = {}
    // Stands in for the auth feature's gate: a signed-in member, so the content is drawn.
    const Unlocked = async ({ content }: { content: () => Promise<ReactNode> }) => content()
    for (const [type, layout] of DRAFT_AND_GATE_CASES) {
      const [full] = await projectSections([withPanel(await gallerySeed(type, layout), 'glass')])
      const gate: SectionGate = {
        callbackUrl: '/fixture-page',
        render: ({ content }) => createElement(Unlocked, { content }),
        load: () => Promise.resolve(full as FullSection),
      }
      const stub = { _key: full?._key, _type: type, access: 'members' } as unknown as PageSection
      const html = await renderSections([stub], { gate })
      cases[`${type} · ${layout ?? 'single layout'}`] = {
        hash: fingerprint(html),
        panel: panelOf(html),
      }
    }
    expect(cases).toMatchSnapshot()
  })

  it.each(
    sectionTypes.map((section) => section.name).filter((type) => layoutsOf(type)[0] !== null),
  )('%s draws a section with no layout stored in its first layout', async (type) => {
    const [first] = layoutsOf(type)
    const { variant: _variant, ...unset } = await gallerySeed(type, first ?? null)
    const [unsetHtml, firstHtml] = await Promise.all([
      projectSections([unset as RawSection]).then((sections) => renderSections(sections)),
      gallerySeed(type, first ?? null)
        .then((seed) => projectSections([seed]))
        .then((sections) => renderSections(sections)),
    ])
    expect(unsetHtml).toBe(firstHtml)
  })
})
