import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  capabilityAvailability,
  currentBaseline,
  evidenceProblems,
  ratchetProblems,
  sourceAvailability,
  type CapabilityBaseline,
} from '@/lib/design/capability-availability'
import { EVIDENCE } from '@/lib/design/capability-evidence'
import { CAPABILITY_EXCEPTIONS } from '@/lib/design/capability-exceptions'
import { declarationProblems, type ContractProblem } from '@/lib/design/capability-policy'
import { exceptionProblems, privateFields } from '@/lib/design/schema-capabilities'

import { COMPONENT_SCHEMAS, DESIGN_COMPONENTS, gate, lookupType } from './design-components'

/**
 * The design capability contract's checks on the real schemas (task 275; README, "Design capability
 * contract"). Each failure names the component, the capability and the fix.
 */

const explain = (problems: readonly ContractProblem[]) =>
  problems.map((problem) => `${problem.message} Fix: ${problem.fix}`)

describe('the design capability contract', () => {
  it('covers every section, slot block and listing', () => {
    const undeclared = DESIGN_COMPONENTS.filter((component) => !component.declaration).map(
      (component) => component.id,
    )
    expect(undeclared).toEqual([])
  })

  it('has a reviewed declaration for every declared component', () => {
    const problems = DESIGN_COMPONENTS.filter((component) => component.declaration).flatMap(
      (component) => declarationProblems(component),
    )
    expect(explain(problems)).toEqual([])
  })

  it('claims availability only where the schema offers the field and the policy applies', () => {
    expect(explain(evidenceProblems(DESIGN_COMPONENTS, EVIDENCE, gate))).toEqual([])
  })

  it('has no private design controls outside the reviewed exceptions', () => {
    const found = [...COMPONENT_SCHEMAS.values()].flatMap((type) =>
      privateFields(type, lookupType, CAPABILITY_EXCEPTIONS).map(
        ({ path, problem, capability }) =>
          `${type.name}: ${path} (${problem}${capability ? `, ${capability}` : ''})`,
      ),
    )
    expect(found).toEqual([])
  })

  it('refuses a forged or borrowed builder marker on a real section (S1 mutation)', () => {
    const linkList = COMPONENT_SCHEMAS.get('linkList')
    const testimonials = COMPONENT_SCHEMAS.get('testimonials')
    const avatar = testimonials?.fields?.find((field) => field.name === 'avatarDesign')
    expect(linkList && avatar).toBeTruthy()
    if (!linkList || !avatar) return
    const mutated = {
      ...linkList,
      fields: [
        ...(linkList.fields ?? []),
        // A builder typed in by hand, and a real builder's stamp copied from another field.
        {
          name: 'sparkle',
          type: 'string',
          group: 'design',
          options: { designBuilder: 'surfaceFields', capability: 'surface' },
        },
        { name: 'halo', type: 'string', group: 'design', options: avatar.options },
      ],
    }
    expect(privateFields(mutated, lookupType, CAPABILITY_EXCEPTIONS)).toEqual([
      { path: 'sparkle', capability: 'surface', problem: 'unreviewedMarker' },
      { path: 'sparkle', problem: 'unbuilt' },
      { path: 'halo', problem: 'forgedProvenance' },
      { path: 'halo', problem: 'unbuilt' },
    ])
  })

  it('keeps the exception register complete and current', () => {
    expect(
      exceptionProblems(CAPABILITY_EXCEPTIONS, COMPONENT_SCHEMAS, lookupType).map(
        (problem) => `${problem.message} Fix: ${problem.fix}`,
      ),
    ).toEqual([])
  })

  it('keeps the committed baseline: no new gap, and every closed gap removed', () => {
    const committed = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', 'capability-baseline.json'), 'utf8'),
    ) as CapabilityBaseline
    const current = currentBaseline(DESIGN_COMPONENTS, EVIDENCE, gate)
    expect(
      explain(
        ratchetProblems(
          current,
          committed,
          DESIGN_COMPONENTS.map((component) => component.id),
        ),
      ),
    ).toEqual([])
  })

  it('reports what each declared component offers today', () => {
    const report = Object.fromEntries(
      DESIGN_COMPONENTS.filter((component) => component.declaration).map((component) => [
        component.id,
        {
          capabilities: capabilityAvailability(component, EVIDENCE, gate)
            .filter((cell) => cell.status !== 'notApplicable')
            .map(
              (cell) =>
                `${cell.capability} ${cell.policy} ${cell.scope ?? ''}${cell.part ? `/${cell.part}` : ''}${cell.layout ? ` @${cell.layout}` : ''}: ${cell.status}${cell.status === 'pending' ? ` (${String(cell.closingTask)})` : ''}`,
            ),
          sources: sourceAvailability(component, EVIDENCE, gate).map(
            (row) => `${row.source}${row.layout ? ` @${row.layout}` : ''}: ${row.status}`,
          ),
        },
      ]),
    )
    expect(report).toMatchSnapshot()
  })
})
