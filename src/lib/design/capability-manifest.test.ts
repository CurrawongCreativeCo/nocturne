import { describe, expect, it } from 'vitest'

import {
  CAPABILITY_IDS,
  declareCapabilities,
  FUTURE_COVERAGE,
  notApplicable,
  type CapabilityPolicies,
} from './capabilities'
import type { CapabilityEvidence } from './capability-evidence'
import { componentContract, contractSummary } from './capability-manifest'
import type { ContractComponent } from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

type Layout = 'open' | 'boxed'

const allNotApplicable = Object.fromEntries(
  CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
) as unknown as CapabilityPolicies<Layout>

const component: ContractComponent = {
  id: 'fixtureCards',
  kind: 'section',
  title: 'Fixture cards',
  layouts: ['open', 'boxed'],
  declaration: declareCapabilities<Layout>(
    {
      ...allNotApplicable,
      glass: {
        policy: 'required',
        scope: 'section',
        layouts: { open: 'applies', boxed: { notApplicable: 'Draws its own panel' } },
      },
      surface: {
        policy: 'conditional',
        scope: 'card',
        trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle' },
      },
    },
    { contentSources: ['testimonials.google'] },
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
  offered: () => ({ offered: true }),
}

describe('componentContract', () => {
  const contract = componentContract(component, gate, evidence)

  it('gives each policy its availability layout by layout, with the evidence behind it', () => {
    expect(contract?.capabilities.glass).toEqual({
      policies: [
        {
          policy: 'required',
          scope: 'section',
          closingTask: 159,
          fields: ['style.panel'],
          availability: { open: 'verified', boxed: { notApplicable: 'Draws its own panel' } },
        },
      ],
      evidence: [
        {
          id: 'fixtureCards.glass.section',
          field: 'style.panel',
          resolvers: ['@/lib/sanity/section-panel#resolveSectionPanel'],
          render: 'src/components/ui/section-frame.tsx',
          target: 'section > :last-child',
          cases: ['fixtureCards.glass.section@open'],
        },
      ],
    })
  })

  it('keeps a conditional policy’s trigger, and says whether its setting exists yet', () => {
    expect(contract?.capabilities.surface).toEqual({
      policies: [
        {
          policy: 'conditional',
          scope: 'card',
          trigger: { kind: 'setting', when: 'Cards are on', path: 'cardStyle', reachable: false },
          closingTask: 156,
          fields: [],
          availability: { open: 'pending', boxed: 'pending' },
        },
      ],
      evidence: [],
    })
    expect(contract?.capabilities.slots).toEqual({ notApplicable: 'Draws nothing of this kind' })
  })

  it('records content sources apart, with their owner and approval gate', () => {
    expect(contract?.contentSources['testimonials.google']).toMatchObject({
      owner: 277,
      availability: { open: 'pending', boxed: 'pending' },
    })
  })

  it('says nothing for a component that has not declared', () => {
    expect(componentContract({ ...component, declaration: undefined }, gate)).toBeUndefined()
  })
})

describe('contractSummary', () => {
  it('lists what is declared, what is not yet, and what the manifest does not cover', () => {
    const summary = contractSummary(
      [component, { id: 'plainBlock', kind: 'slotBlock', title: 'Plain', layouts: [] }],
      gate,
    )
    expect(summary.coverage).toEqual({
      declares: ['section', 'slotBlock', 'listing'],
      declared: ['fixtureCards'],
      notDeclaredYet: ['plainBlock'],
      notCovered: FUTURE_COVERAGE,
    })
    expect(summary.slotBlocks).toEqual([{ type: 'plainBlock', title: 'Plain' }])
  })
})
