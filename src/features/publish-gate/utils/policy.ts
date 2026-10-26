/**
 * The publish gate's policy: given a draft, the published version it replaces and what the server
 * looked up, decide whether a Contributor's change may go live without the agency. Pure, so every
 * rule is unit tested; `api/run-publish-gate.ts` gathers the inputs and acts on the verdict.
 *
 * Three outcomes. `allow`: every change is one a client may make. `review`: something needs the
 * agency (a protected field, a delete, an unpublish, a new address with no redirect, an asset the
 * gate could not verify); the draft stays a draft. `invalid`: the document would not pass its own
 * schema (a missing required field, a taken slug); the editor fixes it. Deny by default: a type,
 * field or value the rules do not know goes to review.
 */
import { normalizePath } from '@/lib/redirects'
import { detectAddressChange, readSlug } from '@/lib/sanity/document-address'
import { diffProtectedDetails } from '@/lib/sanity/protected-changes'

import { changedPaths } from './changed-paths'
import {
  ANY_TYPE,
  INITIAL_VALUES,
  REDIRECTABLE_TYPES,
  REQUIRED_FIELDS,
  UNIQUE_SLUG_TYPES,
} from './document-rules'
import { pageSlugProblem } from './page-slug'

export type Operation = 'publish' | 'unpublish' | 'delete'

type Plain = Record<string, unknown>

export interface PolicyInput {
  operation: Operation
  /** The document's `_type`, read from the dataset, never from the request. */
  type: string
  published: Plain | null
  draft: Plain | null
  /** Published redirects, to see whether a new address leaves the old one behind. */
  redirects: readonly { source: string; destination: string }[]
  /** Ids of other published documents of this type that already use the draft's slug. */
  slugHolders: readonly string[]
  /** Asset ids the draft references that the published version did not and the gate could not verify. */
  unverifiedAssets: readonly string[]
}

export type ReviewReason =
  | { kind: 'delete' | 'unpublish'; message: string }
  | { kind: 'protected-field'; message: string; path: string[] }
  | { kind: 'address-change'; message: string; from: string; to: string }
  | { kind: 'unverified-asset'; message: string; assetId: string }

export interface PublishProblem {
  kind: 'missing-field' | 'slug-taken' | 'slug-invalid' | 'no-draft'
  message: string
  field?: string
}

export interface Verdict {
  outcome: 'allow' | 'review' | 'invalid'
  reasons: ReviewReason[]
  problems: PublishProblem[]
  /** Every path that differs from the published version: for the audit log (names only). */
  changedPaths: string[]
}

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A value that is not there: unset, null, blank, or an empty list or object. */
function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (isPlain(value)) {
    if ('current' in value) return isBlank(value.current)
    if ('_ref' in value) return isBlank(value._ref)
    if ('asset' in value) return isBlank((value.asset as Plain | undefined)?._ref)
    return Object.keys(value).filter((key) => !key.startsWith('_')).length === 0
  }
  return false
}

function equalsInitial(value: unknown, initial: unknown): boolean {
  if (isPlain(value) && isPlain(initial)) {
    const keys = new Set(
      [...Object.keys(value), ...Object.keys(initial)].filter((key) => !key.startsWith('_')),
    )
    return [...keys].every((key) => {
      const a = value[key]
      const b = initial[key]
      return (isBlank(a) && isBlank(b)) || equalsInitial(a, b)
    })
  }
  if (Array.isArray(value) && Array.isArray(initial)) {
    return (
      value.length === initial.length && value.every((item, i) => equalsInitial(item, initial[i]))
    )
  }
  return value === initial
}

/** Whether a new object's protected field holds the value Studio gives it (or nothing at all). */
function isInitialValue(owner: string, field: string, value: unknown): boolean {
  if (isBlank(value)) return true
  for (const key of [owner, ANY_TYPE]) {
    const initial = INITIAL_VALUES[key]
    if (initial && Object.hasOwn(initial, field)) return equalsInitial(value, initial[field])
  }
  return false
}

function protectedReasons(type: string, published: Plain | null, draft: Plain): ReviewReason[] {
  return diffProtectedDetails(type, published, draft).flatMap((change) =>
    change.isNew && change.field && isInitialValue(change.owner, change.field, change.value)
      ? []
      : [
          {
            kind: 'protected-field' as const,
            message: `Changes to ${change.path.join(' › ')} are made by the agency.`,
            path: change.path,
          },
        ],
  )
}

function addressReason(
  type: string,
  published: Plain | null,
  draft: Plain,
  redirects: PolicyInput['redirects'],
): ReviewReason | null {
  const before = readSlug(published)
  const after = readSlug(draft)
  if (!published || !before || before === after) return null
  if (!REDIRECTABLE_TYPES.has(type)) {
    return {
      kind: 'address-change',
      message: 'This changes the address of live content, so the agency checks it first.',
      from: before,
      to: after ?? '',
    }
  }
  const change = detectAddressChange(type, before, after)
  if (!change) return null
  const covered = redirects.some(
    ({ source, destination }) =>
      normalizePath(source) === normalizePath(change.from) &&
      normalizePath(destination) === normalizePath(change.to),
  )
  return covered
    ? null
    : {
        kind: 'address-change',
        message: `The address changes from ${change.from} to ${change.to} with no redirect, so visitors to the old address would get an error.`,
        from: change.from,
        to: change.to,
      }
}

function problemsFor(type: string, draft: Plain, slugHolders: readonly string[]): PublishProblem[] {
  const problems: PublishProblem[] = []
  for (const field of REQUIRED_FIELDS[type] ?? []) {
    if (isBlank(draft[field])) {
      problems.push({ kind: 'missing-field', field, message: `${field} needs a value.` })
    }
  }
  const slug = readSlug(draft)
  if (slug && type === 'page') {
    const problem = pageSlugProblem(slug)
    if (problem) problems.push({ kind: 'slug-invalid', field: 'slug', message: problem })
  }
  if (slug && UNIQUE_SLUG_TYPES.has(type) && slugHolders.length > 0) {
    problems.push({
      kind: 'slug-taken',
      field: 'slug',
      message: `Another ${type} already uses the address "${slug}".`,
    })
  }
  return problems
}

export function evaluatePublish(input: PolicyInput): Verdict {
  const { operation, type, published, draft } = input
  const paths = changedPaths(published, draft)

  if (operation !== 'publish') {
    const what = operation === 'delete' ? 'Deleting' : 'Unpublishing'
    return {
      outcome: 'review',
      reasons: [{ kind: operation, message: `${what} live content is done by the agency.` }],
      problems: [],
      changedPaths: paths,
    }
  }
  if (!draft) {
    return {
      outcome: 'invalid',
      reasons: [],
      problems: [{ kind: 'no-draft', message: 'There is no draft to publish.' }],
      changedPaths: paths,
    }
  }

  const problems = problemsFor(type, draft, input.slugHolders)
  const reasons: ReviewReason[] = protectedReasons(type, published, draft)
  const address = addressReason(type, published, draft, input.redirects)
  if (address) reasons.push(address)
  for (const assetId of input.unverifiedAssets) {
    reasons.push({
      kind: 'unverified-asset',
      assetId,
      message: 'A new file or picture on this document could not be verified.',
    })
  }

  return {
    outcome: problems.length > 0 ? 'invalid' : reasons.length > 0 ? 'review' : 'allow',
    reasons,
    problems,
    changedPaths: paths,
  }
}
