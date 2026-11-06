import { FUTURE_COVERAGE, type FutureCoverage } from './capabilities'
import {
  capabilityAvailability,
  changeRowProblems,
  currentBaseline,
  evidenceProblems,
  ratchetProblems,
  sourceTestProblems,
  staleChangeProblems,
  type CapabilityBaseline,
} from './capability-availability'
import type { BaselineChange } from './capability-baseline-changes'
import type { Evidence } from './capability-evidence'
import type { CapabilityException } from './capability-exceptions'
import {
  declarationProblems,
  type ContractComponent,
  type ContractProblem,
} from './capability-policy'
import {
  exceptionProblems,
  privateFields,
  type PrivateField,
  type SchemaField,
  type SchemaGate,
  type TypeLookup,
} from './schema-capabilities'

/**
 * Every static check of the design capability contract, in one place (task 275): `npm run
 * design-capabilities` prints them and `npm run check` runs it, and the contract's tests call the same
 * function. Each problem names the component, the capability and the fix. The evidence harness (renders
 * and probes, src/app/design-capability-evidence.test.tsx) is a test, not a static check.
 */

const PRIVATE_FIELD_FIX: Record<PrivateField['problem'], string> = {
  unbuilt:
    'Build it with a shared builder (SHARED_BUILDERS in lib/design/capabilities.ts), or, if it is a genuine exception (a layout, query or content-source setting), add a reviewed row to lib/design/capability-exceptions.ts with its reason, reviewer and, while temporary, its removal task. Judged by how the field was built, never by its name.',
  unreviewedMarker:
    'A capability marker without a shared builder needs a reviewed row in lib/design/capability-exceptions.ts that lists and marks the field.',
  markerMismatch:
    'The exception row marks this field as a different capability: fix the row’s `marked` map.',
  markedNonDesign:
    'A query or content-source setting is not a design capability: remove the marker.',
  forgedProvenance:
    'A builder’s provenance stamp belongs to the field it was made for. Build this field with its own shared builder.',
}

const PRIVATE_FIELD_WHAT: Record<PrivateField['problem'], string> = {
  unbuilt: 'is a design control no shared builder made and no reviewed exception covers',
  unreviewedMarker: 'carries a capability marker no shared builder set',
  markerMismatch: 'carries a capability marker that differs from its reviewed exception',
  markedNonDesign: 'is a query or content-source setting carrying a capability marker',
  forgedProvenance:
    'carries a builder stamp made for another field, or a capability that was changed',
}

export interface ContractInputs {
  components: readonly ContractComponent[]
  evidence: readonly Evidence[]
  gate: SchemaGate
  /** Component schemas by name (a listing has none), and the named types fields refer to. */
  schemas: ReadonlyMap<string, SchemaField>
  lookup: TypeLookup
  exceptions: readonly CapabilityException[]
  /** The committed capability-baseline.json. */
  baseline: CapabilityBaseline
  /** The reviewed baseline changes (capability-baseline-changes.ts). */
  changes: readonly BaselineChange[]
  /** The text of a file by its path from the repository root, for the content sources' test files. */
  readSource: (path: string) => string | undefined
}

/** What is wrong with the contract, as `{ component, capability?, message, fix }`. */
/**
 * Every part the contract doesn't cover yet has a task to bring it in (`declaredBy`) or tasks that will
 * implement a capability on it. A part with neither could be forgotten, so it can't be listed.
 */
export function futureCoverageProblems(parts: readonly FutureCoverage[]): ContractProblem[] {
  return parts
    .filter((part) => part.tasks.length === 0 && part.declaredBy === undefined)
    .map((part) => ({
      component: part.part,
      message: `${part.part} is listed as not covered by the contract, and no task is named to bring it in.`,
      fix: 'Name the task that declares it (`declaredBy`) or the tasks that will add its capabilities (`tasks`) in FUTURE_COVERAGE (src/lib/design/capabilities.ts).',
    }))
}

export function contractProblems(inputs: ContractInputs): ContractProblem[] {
  const { components, evidence, gate, schemas, lookup, exceptions, baseline, changes, readSource } =
    inputs
  const problems: ContractProblem[] = []

  for (const component of components) problems.push(...declarationProblems(component))
  problems.push(...evidenceProblems(components, evidence, gate))
  problems.push(...sourceTestProblems(evidence, readSource))
  problems.push(...futureCoverageProblems(FUTURE_COVERAGE))

  for (const [name, type] of schemas) {
    for (const found of privateFields(type, lookup, exceptions)) {
      problems.push({
        component: name,
        ...(found.capability ? { capability: found.capability } : {}),
        message: `${name}: ${found.path} ${PRIVATE_FIELD_WHAT[found.problem]}.`,
        fix: PRIVATE_FIELD_FIX[found.problem],
      })
    }
  }
  for (const problem of exceptionProblems(exceptions, schemas, lookup)) {
    problems.push({ component: problem.component, message: problem.message, fix: problem.fix })
  }

  // The baseline is only judged once every component declares: a gap in a component that doesn't is
  // already reported above, with a better fix.
  if (problems.length === 0) {
    problems.push(
      ...ratchetProblems(
        currentBaseline(components, evidence, gate),
        baseline,
        components.map(({ id }) => id),
      ),
    )
    // The reviewed register: complete rows, and none that outlived what it explained.
    problems.push(...changeRowProblems(changes))
    problems.push(
      ...staleChangeProblems(
        baseline,
        new Map(
          components.map((component) => [
            component.id,
            capabilityAvailability(component, evidence, gate),
          ]),
        ),
        changes,
      ),
    )
  }
  return problems
}

/** A problem as the person fixing it should read it. */
export const formatProblem = ({ message, fix }: ContractProblem) => `✗ ${message}\n  Fix: ${fix}`
