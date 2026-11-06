import { describe, expect, it } from 'vitest'

import {
  CAPABILITY_IDS,
  declareCapabilities,
  notApplicable,
  type CapabilityPolicies,
} from './capabilities'
import { capabilityDocs, DOCS_END, DOCS_START, spliceCapabilityDocs } from './capability-docs'
import type { CapabilityEvidence } from './capability-evidence'
import type { ContractComponent } from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

type Layout = 'open' | 'boxed'

const component: ContractComponent = {
  id: 'fixtureCards',
  kind: 'section',
  title: 'Fixture cards',
  layouts: ['open', 'boxed'],
  declaration: declareCapabilities<Layout>(
    {
      ...(Object.fromEntries(
        CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
      ) as unknown as CapabilityPolicies<Layout>),
      glass: { policy: 'required', scope: 'section' },
      edge: {
        policy: 'required',
        scope: 'section',
        layouts: { open: 'applies', boxed: { notApplicable: 'Boxed draws no edge' } },
      },
      surface: {
        policy: 'conditional',
        scope: 'card',
        trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
        closingTask: 148,
      },
    },
    { contentSources: ['testimonials.manual'] },
  ),
}

const evidence: CapabilityEvidence[] = [
  {
    id: 'fixtureCards.glass.section',
    component: 'fixtureCards',
    capability: 'glass',
    scope: 'section',
    layouts: ['open'],
    field: 'style.panel',
    resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
    render: 'src/components/ui/section-frame.tsx',
    target: 'section > :last-child',
    change: 'attributes',
    probe: { 'style.panel': 'solid' },
  },
]

const gate: SchemaGate = {
  hasSchema: () => true,
  field: (_component, path) =>
    path === 'style.panel'
      ? { marker: { capability: 'glass', designBuilder: 'sectionStyle' } }
      : { missing: `no ${path}` },
  offered: (_component, layout, path) =>
    path === 'style.panel' && layout === 'boxed'
      ? { offered: false, reason: 'hidden' }
      : { offered: true },
}

const docs = capabilityDocs({ components: [component], evidence, gate, exceptions: [] })

describe('capabilityDocs', () => {
  it('shows each capability’s policy and availability for a component', () => {
    const row = docs.split('\n').find((line) => line.startsWith('| Fixture cards'))
    const cells = (row ?? '').split('|').map((cell) => cell.trim())
    const headers = (docs.split('\n').find((line) => line.startsWith('| Component')) ?? '')
      .split('|')
      .map((cell) => cell.trim())
    const at = (name: string) => cells[headers.indexOf(name)]
    // Glass: required, verified on one of two layouts, so partly; Edge: one layout opts out.
    expect(at('Glass')).toBe('R◐')
    expect(at('Edge')).toBe('R…*')
    expect(at('Surface')).toBe('C…')
    expect(at('Slots')).toBe('–')
  })

  it('counts pairs, groups the baseline by closing task and lists the content sources', () => {
    expect(docs).toMatch(/\| Required\s+\| 0\s+\| 1\s+\| 1\s+\|/)
    expect(docs).toMatch(/\| 148\s+\| 0\s+\| 1\s+\|/)
    expect(docs).toMatch(/`testimonials.manual` \| `testimonials` \| pending/)
    // A source no component declares is pending, never verified.
    expect(docs).toMatch(/`cards.services` \| – \| pending \(no component declares it yet\)/)
  })

  it('keeps the three views that are not covered yet visible, each with the task that declares it', () => {
    const rows = docs
      .split('\n')
      .filter((line) => line.includes('Not assessed') || line.includes('Set when declared'))
      .map((line) => line.split('|').map((cell) => cell.trim()))
    expect(rows.map((cells) => [cells[1], cells[4]])).toEqual([
      ['Event details card (events/components/event-view.tsx)', 'Task 156'],
      ['Service page (services/components/service-view.tsx)', 'Task 156'],
      ['Search results (search/components/search-view.tsx)', 'Task 156'],
    ])
    // Declaring a view is not owning its capabilities: those closing tasks are set when it is declared.
    for (const cells of rows) expect(cells[3]).toBe('Set when declared')
  })

  it('leaves no part without a task of some kind', () => {
    expect(docs).not.toContain('None named yet')
  })
})

describe('spliceCapabilityDocs', () => {
  it('replaces only what sits between the markers', () => {
    const readme = `before\n${DOCS_START}\nold\n${DOCS_END}\nafter\n`
    expect(spliceCapabilityDocs(readme, 'new')).toBe(
      `before\n${DOCS_START}\n\nnew\n\n${DOCS_END}\nafter\n`,
    )
  })

  it('says so when the markers are missing or the wrong way round', () => {
    expect(spliceCapabilityDocs('nothing', 'x')).toBeNull()
    expect(spliceCapabilityDocs(`${DOCS_END}\n${DOCS_START}`, 'x')).toBeNull()
  })
})
