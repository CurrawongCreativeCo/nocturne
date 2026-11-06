import { describe, expect, it } from 'vitest'

import {
  CAPABILITY_IDS,
  declareCapabilities,
  notApplicable,
  type CapabilityPolicies,
} from './capabilities'
import {
  capabilityAvailability,
  evidenceProblems,
  pendingBaseline,
  ratchetProblems,
  sourceAvailability,
  type CapabilityBaseline,
} from './capability-availability'
import type { CapabilityEvidence, Evidence } from './capability-evidence'
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
      surface: {
        policy: 'conditional',
        scope: 'card',
        trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
        closingTask: 148,
      },
      edge: {
        policy: 'required',
        scope: 'section',
        layouts: { open: 'applies', boxed: { notApplicable: 'Boxed draws no edge' } },
      },
    },
    { contentSources: ['testimonials.manual', 'testimonials.google'] },
  ),
}

const glassEvidence: CapabilityEvidence = {
  id: 'fixtureCards.glass.section',
  component: 'fixtureCards',
  capability: 'glass',
  scope: 'section',
  layouts: ['open', 'boxed'],
  field: 'style.panel',
  resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
  render: 'src/components/ui/section-frame.tsx',
  target: 'section > :last-child',
  change: 'attributes',
  probe: { 'style.panel': 'solid' },
}

/** A schema where `style.panel` is glass and hidden on Boxed, and `style.edge` is an edge. */
const gate: SchemaGate = {
  hasSchema: () => true,
  field: (_component, path) =>
    path === 'style.panel'
      ? { marker: { capability: 'glass', designBuilder: 'sectionStyle' } }
      : path === 'style.edge'
        ? { marker: { capability: 'edge', designBuilder: 'sectionStyle' } }
        : path === 'items'
          ? { marker: {} }
          : { missing: `fixtureCards has no field ${path}` },
  offered: (_component, layout, path) =>
    path === 'style.panel' && layout === 'boxed'
      ? { offered: false, reason: 'style.panel is hidden for this layout and state' }
      : { offered: true },
}

const cellsFor = (
  evidence: readonly Evidence[],
  results?: Parameters<typeof capabilityAvailability>[3],
) => capabilityAvailability(component, evidence, gate, results)

describe('capabilityAvailability', () => {
  it('verifies a layout only where the schema offers the field and evidence covers it', () => {
    const glass = cellsFor([glassEvidence]).filter((cell) => cell.capability === 'glass')
    expect(glass).toEqual([
      expect.objectContaining({
        layout: 'open',
        status: 'verified',
        evidence: ['fixtureCards.glass.section@open'],
      }),
      expect.objectContaining({
        layout: 'boxed',
        status: 'pending',
        unverified:
          'fixtureCards.glass.section@boxed: style.panel is hidden for this layout and state',
      }),
    ])
  })

  it('is pending with no evidence, and keeps the closing task and trigger', () => {
    const surface = cellsFor([]).filter((cell) => cell.capability === 'surface')
    expect(surface[0]).toMatchObject({
      policy: 'conditional',
      status: 'pending',
      closingTask: 148,
      trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
      // The trigger's setting doesn't exist yet.
      reachable: false,
    })
  })

  it('reports a layout the harness found unchanged as pending, never verified', () => {
    const results = new Map([
      ['fixtureCards.glass.section@open', 'ignored' as const],
      ['fixtureCards.glass.section@boxed', 'changed' as const],
    ])
    const glass = cellsFor([glassEvidence], results).filter((cell) => cell.capability === 'glass')
    expect(glass[0]).toMatchObject({
      layout: 'open',
      status: 'pending',
      unverified:
        'fixtureCards.glass.section@open: case fixtureCards.glass.section@open found the target ignored',
    })
  })

  it('keeps not-applicable layouts apart from pending ones', () => {
    const edge = cellsFor([]).filter((cell) => cell.capability === 'edge')
    expect(edge.map(({ layout, status }) => [layout, status])).toEqual([
      ['open', 'pending'],
      ['boxed', 'notApplicable'],
    ])
  })
})

describe('sourceAvailability', () => {
  it('records each source apart from capabilities, with its owner and approval gate', () => {
    const manual: Evidence = {
      id: 'fixtureCards.manual',
      component: 'fixtureCards',
      source: 'testimonials.manual',
      layouts: ['open', 'boxed'],
      field: 'items',
      resolvers: [
        { module: '@/features/pages/components/sections/testimonials', export: 'Testimonials' },
      ],
      render: 'src/features/pages/components/sections/testimonials',
      target: 'section > :last-child',
      change: 'content',
      probe: { 'items.0.quote': 'Other words.' },
    }
    const rows = sourceAvailability(component, [manual], gate)
    expect(rows.filter((row) => row.layout === 'open')).toEqual([
      {
        source: 'testimonials.manual',
        layout: 'open',
        status: 'verified',
        owner: 156,
        evidence: ['fixtureCards.manual@open'],
      },
      expect.objectContaining({
        source: 'testimonials.google',
        status: 'pending',
        owner: 277,
        gate: expect.stringMatching(/approval/) as string,
      }),
    ])
  })
})

describe('evidenceProblems', () => {
  const messages = (evidence: readonly Evidence[], components = [component]) =>
    evidenceProblems(components, evidence, gate).map((problem) => problem.message)

  it('accepts evidence that matches the policy, the field and what the schema offers', () => {
    expect(messages([{ ...glassEvidence, layouts: ['open'] }])).toEqual([])
  })

  it('refuses a claim on a layout the schema hides, or the declaration excludes', () => {
    expect(messages([glassEvidence])).toEqual([
      "Evidence fixtureCards.glass.section: the schema doesn't offer style.panel on boxed (style.panel is hidden for this layout and state).",
    ])
    const edge: CapabilityEvidence = {
      ...glassEvidence,
      id: 'fixtureCards.edge.section',
      capability: 'edge',
      field: 'style.edge',
      probe: { 'style.edge': 'wave' },
    }
    expect(messages([edge])).toEqual([
      'Evidence fixtureCards.edge.section: the declaration has no policy for edge at scope section on boxed.',
    ])
  })

  it('refuses evidence for a field that does not exist or is not marked as the capability', () => {
    expect(messages([{ ...glassEvidence, layouts: ['open'], field: 'style.sparkle' }])).toEqual([
      "Evidence fixtureCards.glass.section: its field doesn't exist (fixtureCards has no field style.sparkle).",
    ])
    expect(messages([{ ...glassEvidence, layouts: ['open'], field: 'style.edge' }])).toEqual([
      "Evidence fixtureCards.glass.section: style.edge isn't marked as glass (it is edge).",
    ])
  })

  it('refuses evidence for an undeclared component, missing layouts and a reused id', () => {
    expect(messages([glassEvidence], [{ ...component, declaration: undefined }])).toEqual([
      'Evidence fixtureCards.glass.section: fixtureCards has no declaration to verify.',
    ])
    expect(messages([{ ...glassEvidence, layouts: undefined }])).toEqual([
      'Evidence fixtureCards.glass.section: fixtureCards has layouts, and the entry names none.',
    ])
    const open = { ...glassEvidence, layouts: ['open'] }
    expect(messages([open, open])).toEqual([
      'Evidence fixtureCards.glass.section: the id is used twice.',
    ])
  })
})

describe('the baseline ratchet', () => {
  const current = pendingBaseline(
    new Map([['fixtureCards', cellsFor([{ ...glassEvidence, layouts: ['open'] }])]]),
  )
  const ids = ['fixtureCards']

  it('lists required and conditional gaps apart, each with its closing task and layouts', () => {
    expect(current).toEqual({
      required: [
        {
          component: 'fixtureCards',
          capability: 'glass',
          scope: 'section',
          layouts: ['boxed'],
          closingTask: 159,
        },
        {
          component: 'fixtureCards',
          capability: 'edge',
          scope: 'section',
          layouts: ['open'],
          closingTask: 151,
        },
      ],
      conditional: [
        {
          component: 'fixtureCards',
          capability: 'surface',
          scope: 'card',
          layouts: ['open', 'boxed'],
          closingTask: 148,
        },
      ],
    })
    expect(ratchetProblems(current, current, ids)).toEqual([])
  })

  it('fails a new gap, and a closed gap left in the baseline', () => {
    const smaller: CapabilityBaseline = { ...current, required: current.required.slice(1) }
    expect(ratchetProblems(current, smaller, ids).map((problem) => problem.message)).toEqual([
      "fixtureCards: glass (required, section) is pending on boxed and isn't in the baseline.",
    ])
    const stale: CapabilityBaseline = {
      ...current,
      conditional: current.conditional.map((entry) => ({
        ...entry,
        layouts: ['open', 'boxed', 'extra'],
      })),
    }
    expect(ratchetProblems(current, stale, ids).map((problem) => problem.message)).toEqual([
      'fixtureCards: surface (conditional, card) is no longer pending on extra, but the baseline still lists it.',
    ])
  })

  it('ignores entries for a component the site has removed', () => {
    expect(ratchetProblems({ required: [], conditional: [] }, current, [])).toEqual([])
  })
})
