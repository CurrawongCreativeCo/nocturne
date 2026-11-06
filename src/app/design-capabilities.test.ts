import { describe, expect, it } from 'vitest'

import {
  capabilityAvailability,
  evidenceProblems,
  sourceAvailability,
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

/**
 * Components not declared yet. Stage 2 of task 275 declares a representative slice first; this list
 * only shrinks, and is gone once every component is declared.
 */
const NOT_DECLARED_YET = [
  'richText',
  'featuresGrid',
  'logoCloud',
  'faq',
  'ctaBanner',
  'formSection',
  'pricingTable',
  'newsletterSignup',
  'stats',
  'gallery',
  'location',
  'team',
  'video',
  'process',
  'embed',
  'events',
  'statsBar',
  'logoRow',
  'launchDate',
  'slotImage',
  'slotVideo',
]

const explain = (problems: readonly ContractProblem[]) =>
  problems.map((problem) => `${problem.message} Fix: ${problem.fix}`)

describe('the design capability contract', () => {
  it('covers every section, slot block and listing', () => {
    const undeclared = DESIGN_COMPONENTS.filter((component) => !component.declaration).map(
      (component) => component.id,
    )
    expect(undeclared).toEqual(NOT_DECLARED_YET)
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

  it('keeps the exception register complete and current', () => {
    expect(
      exceptionProblems(CAPABILITY_EXCEPTIONS, COMPONENT_SCHEMAS, lookupType).map(
        (problem) => `${problem.message} Fix: ${problem.fix}`,
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
