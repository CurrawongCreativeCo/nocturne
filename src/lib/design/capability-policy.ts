import {
  CAPABILITY_IDS,
  capabilityById,
  CONTENT_SOURCES,
  NOT_REVIEWED,
  type CapabilityId,
  type CapabilityPolicy,
  type ContentSourceDefinition,
  type DesignCapabilityDeclaration,
  type Scope,
  type ScopePolicy,
  type TextRole,
  type Trigger,
} from './capabilities'

/**
 * Reading and checking a component's declared policy (capabilities.ts). Pure, so the checks, the
 * manifest generator and the tests share it.
 */

/** Where a slot block can be placed: a host section, its slot field and the host's layouts. */
export interface SlotHost {
  section: string
  /** The host's slot field (`supporting`, `media`). */
  slot: string
  layouts: readonly string[]
}

/**
 * A component the contract covers: a section type, a slot block, a listing (cards drawn from
 * documents, such as the blog's) or a view (a page that isn't a section, such as the footer).
 */
export interface ContractComponent {
  id: string
  kind: 'section' | 'slotBlock' | 'listing' | 'view'
  title: string
  /** Its layouts (a section's `variant` values); empty for a component with one layout. */
  layouts: readonly string[]
  /** A slot block only: every host it is allowed in. Its evidence must hold in all of them. */
  hosts?: readonly SlotHost[]
  declaration?: DesignCapabilityDeclaration
}

/** One problem, said so a person can fix it. */
export interface ContractProblem {
  component: string
  capability?: CapabilityId
  message: string
  fix: string
}

/** The policy for one capability, at one scope (and part) and one layout. */
export interface PolicyCell {
  capability: CapabilityId
  /** Null when the whole capability is not applicable. */
  scope: Scope | null
  part?: string
  /** Null for a component with one layout. */
  layout: string | null
  policy: 'required' | 'conditional' | 'notApplicable'
  reason?: string
  trigger?: Trigger
  roles?: readonly TextRole[]
  /** The task that closes the pair: the policy's `closingTask`, else the capability's owner. */
  closingTask?: number
}

const scopesOf = (policy: ScopePolicy): readonly Scope[] =>
  typeof policy.scope === 'string' ? [policy.scope] : policy.scope

/** A declaration entry as a list of scoped policies, or the not-applicable policy. */
export function scopedPolicies(entry: CapabilityPolicy): readonly ScopePolicy[] {
  if (Array.isArray(entry)) return entry as readonly ScopePolicy[]
  const single = entry as Exclude<CapabilityPolicy, readonly ScopePolicy[]>
  return single.policy === 'notApplicable' ? [] : [single]
}

/** Every cell of one capability's policy for a component, layout by layout. */
export function policyCells(
  capability: CapabilityId,
  entry: CapabilityPolicy,
  layouts: readonly string[],
): PolicyCell[] {
  const all: (string | null)[] = layouts.length > 0 ? [...layouts] : [null]
  const single = entry as { policy?: string; reason?: string }
  if (!Array.isArray(entry) && single.policy === 'notApplicable') {
    return all.map((layout) => ({
      capability,
      scope: null,
      layout,
      policy: 'notApplicable',
      reason: single.reason,
    }))
  }
  const { owner } = capabilityById(capability)
  const cells: PolicyCell[] = []
  for (const policy of scopedPolicies(entry)) {
    for (const scope of scopesOf(policy)) {
      for (const layout of all) {
        const rule = layout === null ? 'applies' : policy.layouts?.[layout]
        const base = {
          capability,
          scope,
          ...(policy.part ? { part: policy.part } : {}),
          layout,
          ...(policy.roles ? { roles: policy.roles } : {}),
        }
        if (rule === undefined || rule === 'applies') {
          cells.push({
            ...base,
            policy: policy.policy,
            ...(policy.policy === 'conditional' ? { trigger: policy.trigger } : {}),
            closingTask: policy.closingTask ?? owner,
          })
        } else {
          cells.push({ ...base, policy: 'notApplicable', reason: rule.notApplicable })
        }
      }
    }
  }
  return cells
}

const TASK_WORDING = /\btasks?\b|\bdesign (asks|needs)\b/i

function reasonProblem(reason: unknown): string | undefined {
  if (typeof reason !== 'string' || reason.trim() === '') return 'has no reason'
  if (reason.trim() === NOT_REVIEWED) return `still says "${NOT_REVIEWED}"`
  return undefined
}

const REASON_FIX =
  'Review it: make it Required, Conditional (with a typed trigger) or Not applicable with the reason it does not apply to this component. README, "Design capability contract", says how.'

/**
 * Everything wrong with a component's declaration. Empty when it declares every capability once, with
 * reviewed reasons, typed triggers, every layout accounted for and no two policies for the same scope,
 * part and layout.
 */
export function declarationProblems(component: ContractComponent): ContractProblem[] {
  const problems: ContractProblem[] = []
  const problem = (capability: CapabilityId | undefined, message: string, fix: string) =>
    problems.push({ component: component.id, ...(capability ? { capability } : {}), message, fix })

  const declaration = component.declaration
  if (!declaration) {
    problem(
      undefined,
      `${component.title} (${component.id}) has no design capability declaration.`,
      'Declare every capability with declareCapabilities (lib/design/capabilities.ts): Required, Conditional with a trigger, or Not applicable with a reason.',
    )
    return problems
  }

  const declared = declaration.capabilities as Record<string, CapabilityPolicy | undefined>
  for (const key of Object.keys(declared)) {
    if (!(CAPABILITY_IDS as readonly string[]).includes(key)) {
      problem(
        undefined,
        `${component.id} declares "${key}", which isn't a capability.`,
        `Use one of: ${CAPABILITY_IDS.join(', ')}. A capability that is missing is proposed for the template first.`,
      )
    }
  }

  for (const id of CAPABILITY_IDS) {
    const entry = declared[id]
    if (entry === undefined) {
      problem(
        id,
        `${component.id} doesn't declare ${id}.`,
        `Add ${id}: Required, Conditional with a trigger, or Not applicable with a reason.`,
      )
      continue
    }
    const definition = capabilityById(id)
    const single = entry as { policy?: string; reason?: unknown }
    if (!Array.isArray(entry) && single.policy === 'notApplicable') {
      const wrong = reasonProblem(single.reason)
      if (wrong) {
        problem(id, `${component.id}: ${id} is not applicable but ${wrong}.`, REASON_FIX)
      }
      continue
    }

    const policies = scopedPolicies(entry)
    if (policies.length === 0) {
      problem(id, `${component.id}: ${id} has an empty list of policies.`, 'Declare at least one.')
      continue
    }
    const covered = new Map<string, number>()
    const scopeParts = new Map<Scope, (string | undefined)[]>()
    for (const policy of policies) {
      // Types keep Not applicable out of a list; a hand-built declaration might not.
      const kind = (policy as { policy: string }).policy
      if (kind !== 'required' && kind !== 'conditional') {
        problem(
          id,
          `${component.id}: ${id} mixes "${kind}" into a list of scoped policies.`,
          'A list holds Required and Conditional policies only. Leave layouts or scopes that do not apply out, with a reason.',
        )
        continue
      }
      for (const scope of scopesOf(policy)) {
        if (!definition.scopes.includes(scope)) {
          problem(
            id,
            `${component.id}: ${id} is declared at scope "${scope}", which ${id} doesn't have.`,
            `Use one of: ${definition.scopes.join(', ')}.`,
          )
        }
        scopeParts.set(scope, [...(scopeParts.get(scope) ?? []), policy.part])
      }
      if (policy.policy === 'conditional') {
        const trigger = policy.trigger as Partial<Trigger> | undefined
        if (
          !trigger ||
          !['anatomy', 'variant', 'setting'].includes(trigger.kind ?? '') ||
          !trigger.when?.trim()
        ) {
          problem(
            id,
            `${component.id}: ${id} is conditional without a typed trigger.`,
            "Give it a trigger: { kind: 'anatomy' | 'variant' | 'setting', when, path? }.",
          )
        } else if (TASK_WORDING.test(trigger.when)) {
          problem(
            id,
            `${component.id}: ${id}'s trigger "${trigger.when}" depends on a task or a request, not on the component.`,
            'Describe the anatomy, layout or setting that makes it apply. If it applies regardless, it is Required with a closingTask.',
          )
        }
      } else if ('trigger' in policy) {
        problem(
          id,
          `${component.id}: ${id} is required but has a trigger.`,
          'Required applies whenever its layouts do: remove the trigger, or make it conditional.',
        )
      }
      if (policy.roles) {
        const allowed: readonly TextRole[] = definition.roles ?? []
        const unknown = policy.roles.filter((role) => !allowed.includes(role))
        if (unknown.length > 0) {
          problem(
            id,
            `${component.id}: ${id} names roles it doesn't style: ${unknown.join(', ')}.`,
            allowed.length > 0 ? `Use: ${allowed.join(', ')}.` : 'Remove the roles.',
          )
        }
      }
      if (policy.closingTask !== undefined) {
        if (!Number.isInteger(policy.closingTask) || policy.closingTask <= 0) {
          problem(id, `${component.id}: ${id} has an invalid closingTask.`, 'Use a task number.')
        } else if (policy.closingTask === definition.owner) {
          problem(
            id,
            `${component.id}: ${id}'s closingTask is the capability's owner (${definition.owner}).`,
            'Leave closingTask out: it names another task only.',
          )
        }
      }
      if (policy.layouts) {
        if (component.layouts.length === 0) {
          problem(
            id,
            `${component.id}: ${id} names layouts, but ${component.id} has only one.`,
            'Remove `layouts`.',
          )
        } else {
          const named = Object.keys(policy.layouts)
          const missing = component.layouts.filter((layout) => !named.includes(layout))
          const unknown = named.filter((layout) => !component.layouts.includes(layout))
          if (missing.length > 0) {
            problem(
              id,
              `${component.id}: ${id} leaves out layout${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.`,
              "Account for every layout: 'applies', or { notApplicable: reason }.",
            )
          }
          if (unknown.length > 0) {
            problem(
              id,
              `${component.id}: ${id} names layouts ${component.id} doesn't have: ${unknown.join(', ')}.`,
              `Its layouts are: ${component.layouts.join(', ')}.`,
            )
          }
          for (const [layout, rule] of Object.entries(policy.layouts)) {
            if (rule === 'applies') continue
            const wrong = reasonProblem((rule as { notApplicable?: unknown }).notApplicable)
            if (wrong) {
              problem(
                id,
                `${component.id}: ${id} on layout ${layout} is not applicable but ${wrong}.`,
                'Write the reviewed reason.',
              )
            }
          }
          if (!Object.values(policy.layouts).includes('applies')) {
            problem(
              id,
              `${component.id}: ${id} applies to none of its layouts.`,
              'Declare it not applicable instead, with the reason.',
            )
          }
        }
      }
      const layouts = component.layouts.length > 0 ? component.layouts : [null]
      for (const scope of scopesOf(policy)) {
        for (const layout of layouts) {
          if (layout !== null && policy.layouts && policy.layouts[layout] !== 'applies') continue
          const key = `${scope}|${policy.part ?? ''}|${layout ?? ''}`
          covered.set(key, (covered.get(key) ?? 0) + 1)
        }
      }
    }
    for (const [key, count] of covered) {
      if (count < 2) continue
      const [scope, part, layout] = key.split('|')
      problem(
        id,
        `${component.id}: ${id} has ${count} policies for scope ${scope}${part ? `, part ${part}` : ''}${layout ? `, layout ${layout}` : ''}.`,
        'One policy per scope, part and layout: these contradict or repeat each other.',
      )
    }
    for (const [scope, parts] of scopeParts) {
      if (parts.length < 2) continue
      if (parts.some((part) => !part) || new Set(parts).size !== parts.length) {
        problem(
          id,
          `${component.id}: ${id} has several policies at scope ${scope} without a distinct part for each.`,
          'Name the part each one covers (part: "profile", part: "background").',
        )
      }
    }
  }

  for (const source of declaration.contentSources) {
    const definition = (CONTENT_SOURCES as readonly ContentSourceDefinition[]).find(
      (candidate) => candidate.id === source,
    )
    if (!definition) {
      problem(
        undefined,
        `${component.id} names an unknown content source "${source}".`,
        'Use one from CONTENT_SOURCES (lib/design/capabilities.ts).',
      )
    } else if (definition.component !== component.id) {
      problem(
        undefined,
        `${component.id} names content source ${source}, which feeds ${definition.component ?? 'a component that does not exist yet'}.`,
        "Declare a source on the component it feeds, and set that component in the source's definition.",
      )
    }
  }
  return problems
}
