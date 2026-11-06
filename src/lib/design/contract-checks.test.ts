import { describe, expect, it } from 'vitest'

import { builtBy } from '@/lib/sanity/schema/capability-marker'

import {
  CAPABILITY_IDS,
  declareCapabilities,
  notApplicable,
  NOT_REVIEWED,
  type CapabilityPolicies,
} from './capabilities'
import { currentBaseline, type CapabilityBaseline } from './capability-availability'
import type { CapabilityEvidence } from './capability-evidence'
import type { CapabilityException } from './capability-exceptions'
import type { ContractComponent } from './capability-policy'
import { contractProblems, formatProblem, type ContractInputs } from './contract-checks'
import { schemaGate, type SchemaField } from './schema-capabilities'

/** A small contract: one section, a shared style type and one reviewed declaration. */
const style: SchemaField = {
  name: 'fixtureStyle',
  type: 'object',
  fields: [
    builtBy(
      'sectionStyle',
      {
        name: 'panel',
        type: 'string',
      },
      'glass',
    ),
  ],
}
const section = (extra: SchemaField[] = []): SchemaField => ({
  name: 'fixtureSection',
  type: 'object',
  fields: [
    { name: 'title', type: 'string', group: 'content' },
    { name: 'style', type: 'fixtureStyle', group: 'design' },
    ...extra,
  ],
})
const types = new Map([[style.name, style]])
const lookup = (name: string) => types.get(name)

const declare = (overrides: Partial<Record<string, unknown>> = {}) =>
  declareCapabilities({
    ...(Object.fromEntries(
      CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
    ) as unknown as CapabilityPolicies),
    glass: { policy: 'required', scope: 'section' },
    ...overrides,
  })

const glassEvidence: CapabilityEvidence = {
  id: 'fixtureSection.glass.section',
  component: 'fixtureSection',
  capability: 'glass',
  scope: 'section',
  field: 'style.panel',
  resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
  render: 'src/components/ui/section-frame.tsx',
  target: 'section > :last-child',
  change: 'attributes',
  probe: { 'style.panel': 'solid' },
}

function inputs(overrides: Partial<ContractInputs> = {}, schema = section()): ContractInputs {
  const component: ContractComponent = {
    id: 'fixtureSection',
    kind: 'section',
    title: 'Fixture section',
    layouts: [],
    declaration: declare(),
  }
  const schemas = new Map([['fixtureSection', schema]])
  const evidence = overrides.evidence ?? [glassEvidence]
  const components = overrides.components ?? [component]
  const gate = schemaGate(schemas, lookup)
  const baseline = currentBaseline(components, evidence, gate)
  return {
    components,
    evidence,
    gate,
    schemas,
    lookup,
    exceptions: [],
    baseline,
    readSource: () => undefined,
    ...overrides,
  }
}

const messages = (given: ContractInputs) => contractProblems(given).map((p) => p.message)

describe('contractProblems', () => {
  it('holds for a reviewed declaration, shared builders and evidence that matches', () => {
    expect(contractProblems(inputs())).toEqual([])
  })

  it('fails a component with no declaration, naming it and the fix', () => {
    const [problem] = contractProblems(
      inputs({
        components: [
          { id: 'fixtureSection', kind: 'section', title: 'Fixture section', layouts: [] },
        ],
        evidence: [],
      }),
    )
    expect(problem?.component).toBe('fixtureSection')
    expect(problem && formatProblem(problem)).toMatch(
      /has no design capability declaration\.\n {2}Fix: Declare every capability/,
    )
  })

  it('fails a declaration missing a capability, and a generated one nobody reviewed', () => {
    const missing = declare() as { capabilities: Record<string, unknown> }
    const partial = { ...missing, capabilities: { ...missing.capabilities } }
    delete partial.capabilities.edge
    const target = (declaration: unknown): ContractComponent => ({
      id: 'fixtureSection',
      kind: 'section',
      title: 'Fixture section',
      layouts: [],
      declaration: declaration as ContractComponent['declaration'],
    })
    expect(
      contractProblems(inputs({ components: [target(partial)] })).map((p) => [
        p.capability,
        p.message,
      ]),
    ).toContainEqual(['edge', "fixtureSection doesn't declare edge."])
    const generated = declare({ surface: notApplicable(NOT_REVIEWED) })
    expect(messages(inputs({ components: [target(generated)] }))).toEqual([
      'fixtureSection: surface is not applicable but still says "Not reviewed yet".',
    ])
  })

  it('fails a false availability claim: evidence for a field that does not exist', () => {
    expect(messages(inputs({ evidence: [{ ...glassEvidence, field: 'style.sparkle' }] }))).toEqual([
      "Evidence fixtureSection.glass.section: its field doesn't exist (fixtureSection has no field style.sparkle).",
    ])
  })

  it('fails a new private design field, judged by how it was built and not by its name', () => {
    const found = contractProblems(
      inputs({}, section([{ name: 'shadow', type: 'string', group: 'design' }])),
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.message).toBe(
      'fixtureSection: shadow is a design control no shared builder made and no reviewed exception covers.',
    )
    expect(found[0]?.fix).toMatch(
      /shared builder .* reviewed row to lib\/design\/capability-exceptions\.ts/,
    )
    // The same name in the Content group is not a design control.
    expect(
      contractProblems(inputs({}, section([{ name: 'shadow', type: 'string', group: 'content' }]))),
    ).toEqual([])
  })

  it('accepts a private field once a reviewed exception covers it, and fails a stale one', () => {
    const exception: CapabilityException = {
      component: 'fixtureSection',
      fields: ['columns'],
      justification: 'A layout count.',
      reviewer: 'owner',
      reviewed: '2026-11-06',
      status: 'permanent',
      nature: 'layout',
    }
    const withColumns = section([{ name: 'columns', type: 'number', group: 'design' }])
    expect(contractProblems(inputs({ exceptions: [exception] }, withColumns))).toEqual([])
    expect(messages(inputs({ exceptions: [exception] }))).toEqual([
      "fixtureSection: columns doesn't exist.",
    ])
  })

  it('applies the baseline ratchet: a new gap fails, a closed gap left in the baseline fails', () => {
    const pending: CapabilityEvidence[] = []
    const base = inputs({ evidence: pending })
    // The glass pair has no evidence, so it is a gap the baseline must list.
    expect(messages({ ...base, baseline: { required: [], conditional: [] } })).toEqual([
      "fixtureSection: glass (required, section) is pending and isn't in the baseline.",
    ])
    const closed: CapabilityBaseline = {
      required: [
        {
          component: 'fixtureSection',
          capability: 'glass',
          scope: 'section',
          layouts: [null],
          closingTask: 159,
        },
        {
          component: 'fixtureSection',
          capability: 'edge',
          scope: 'section',
          layouts: [null],
          closingTask: 151,
        },
      ],
      conditional: [],
    }
    expect(messages({ ...base, baseline: closed })).toEqual([
      'fixtureSection: edge (required, section) is no longer pending, but the baseline still lists it.',
    ])
  })
})
