import { describe, expect, it } from 'vitest'

import { pictureDepthFields } from '@/lib/sanity/schema/surface-design'

import { provenanceOf } from './builder-provenance'
import {
  CAPABILITY_IDS,
  declareCapabilities,
  notApplicable,
  type CapabilityPolicies,
} from './capabilities'
import { capabilityAvailability, evidenceProblems } from './capability-availability'
import type { CapabilityEvidence } from './capability-evidence'
import type { ContractComponent } from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

/**
 * Task 147 stores a picture's depth in a `pictureDepthDesign` object on the section, while the contract
 * declares it at card scope for Team, Gallery and Testimonials. This is the regression test for that
 * assumption: evidence for a card-scoped pictureDepth policy, whose field is the real builder's stamped
 * leaf, is accepted and verifies the pair. If the contract ever rejects it, the storage design (not the
 * policy or the scope) is what has to change.
 */
type Layout = 'grid' | 'slider'

const component: ContractComponent = {
  id: 'fixturePictures',
  kind: 'section',
  title: 'Fixture pictures',
  layouts: ['grid', 'slider'],
  declaration: declareCapabilities<Layout>({
    ...(Object.fromEntries(
      CAPABILITY_IDS.map((id) => [id, notApplicable('Draws nothing of this kind')]),
    ) as unknown as CapabilityPolicies<Layout>),
    pictureDepth: { policy: 'required', scope: 'card' },
  }),
}

interface BuiltLeaf {
  name: string
  options: unknown
}
const leaves = (pictureDepthFields({}) as unknown as { fields: BuiltLeaf[] }).fields

/** A schema whose only design fields are the real builder's output, read the way the contract reads it. */
const gate: SchemaGate = {
  hasSchema: () => true,
  field: (_component, path) => {
    const stamp = provenanceOf(
      leaves.find((leaf) => `pictureDepthDesign.${leaf.name}` === path)?.options,
    )
    return stamp
      ? {
          marker: {
            ...(stamp.capability ? { capability: stamp.capability } : {}),
            designBuilder: stamp.builder,
          },
        }
      : { missing: `no field ${path}` }
  },
  offered: () => ({ offered: true }),
}

const evidence: CapabilityEvidence = {
  id: 'fixturePictures.pictureDepth.card',
  component: 'fixturePictures',
  capability: 'pictureDepth',
  scope: 'card',
  layouts: ['grid', 'slider'],
  field: 'pictureDepthDesign.shadow',
  resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolvePictureDepth' }],
  render: 'src/components/ui/framed-image.tsx',
  target: '[data-framed-image]',
  change: 'attributes',
  probe: { 'pictureDepthDesign.shadow': 'floating' },
}

describe('a section-level pictureDepthDesign object and the card-scoped capability', () => {
  it('accepts evidence whose field is the builder’s stamped leaf', () => {
    expect(evidenceProblems([component], [evidence], gate)).toEqual([])
  })

  it('verifies the card-scoped pair on every layout', () => {
    const cells = capabilityAvailability(component, [evidence], gate).filter(
      (cell) => cell.capability === 'pictureDepth',
    )
    expect(cells.map(({ layout, scope, status }) => [layout, scope, status])).toEqual([
      ['grid', 'card', 'verified'],
      ['slider', 'card', 'verified'],
    ])
  })

  it('refuses the same evidence on a field that is not stamped pictureDepth', () => {
    const plain: SchemaGate = { ...gate, field: () => ({ marker: { capability: 'depth' } }) }
    expect(evidenceProblems([component], [evidence], plain).map((p) => p.message)).toEqual([
      expect.stringContaining("isn't marked as pictureDepth (it is depth)"),
    ])
  })
})
