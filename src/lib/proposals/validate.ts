import { resolveDesignTokens, type DesignOverrides } from '@/lib/color/resolve-design-tokens'
import { isClientEditable as registryIsClientEditable } from '@/lib/sanity/client-editable'
import { panelProblem } from '@/lib/sanity/section-panel'

import { capabilityVerdicts, layoutOfSection, type MarkedField } from './capabilities'
import {
  getAt,
  insertAt,
  parsePath,
  setCreatingParents,
  unsetAt,
  type InsertPosition,
  type PathSegment,
} from './paths'
import type {
  AcceptedPatch,
  ChangeProposal,
  DesignManifest,
  DocumentSnapshot,
  ManifestField,
  ManifestSection,
  ManifestSlot,
  PartResult,
  PatchUnit,
  ProposalPart,
  ProposalValidation,
  Rejection,
  RejectedPatch,
  RejectionCode,
} from './types'

/**
 * Checks a change proposal without writing anything (design engine architecture, §6.2). Pure: the
 * manifest and the documents it was made from are passed in, so tests run on small in-memory ones.
 *
 * 1. The proposal is split into one unit per operation and path, and each unit is sorted into a content
 *    or a design part. The parts are validated and fail separately, so a rejected design part never
 *    blocks the content part (architecture §5). A part with any rejection writes nothing at all.
 * 2. Manifest: the document is one the manifest describes, the revision is current, the path exists,
 *    the value is in its list, a slot block is allowed there and an array's limit holds.
 * 3. Design: a Brand colours change that makes a text pair fail (through `resolveDesignTokens`) is
 *    rejected; a section's panel that cannot be made readable is only a warning, as it is in Studio.
 * 4. Capabilities: a value in a field that is a shared design capability, or feeds a content source,
 *    must be verified for the section's layout in the manifest (capabilities.ts); anything else is
 *    rejected with the reason. Fields that carry no capability keep the ordinary checks.
 * 5. Permissions: a change to anything clients may not edit (CLIENT_EDITABLE, through the manifest)
 *    is marked `needsAgencyReview`.
 *
 * The Sanity schema's own validation rules cannot run here; scripts/proposal.mjs runs them on the
 * drafts it writes (README, "Change proposals").
 */

export interface ValidateDeps {
  manifest: DesignManifest
  /** The documents the changes apply to: the draft where there is one, else the published document. */
  documents: Readonly<Record<string, DocumentSnapshot>>
  /**
   * Whether the person applying holds an agency role. Left out, a patch that needs agency review is
   * only flagged (the read-only `validate` command). Set, the flag is enforced: `false` rejects every
   * such patch with `agency-permission-required`, so a client-level run can never apply agency-only changes.
   */
  agencyPermitted?: boolean
  /** Defaults to the CLIENT_EDITABLE registry. */
  isClientEditable?: (type: string, field: string) => boolean
  /**
   * How many times the accepted changes are re-judged against what would actually be written before the
   * proposal is rejected as unstable (default 8). A part can only stop applying once, so two parts settle
   * in at most four rounds: the cap is a guard that fails closed, and a hook for tests.
   */
  maxRounds?: number
}

/** Fields that are the section's look rather than its content, besides the ones typed as a style. */
const DESIGN_FIELDS: ReadonlySet<string> = new Set([
  'variant',
  'imagePosition',
  'proportion',
  'imageShape',
  'partMotion',
  'logoColour',
  'glassStrength',
  'thumbnailSize',
  'rowStyle',
])
const DESIGN_KINDS: ReadonlySet<string> = new Set(['sectionStyle', 'imageDesign'])

/** Kinds whose stored shape the manifest doesn't spell out, so their values are not looked into. */
const OPAQUE_KINDS: ReadonlySet<string> = new Set([
  'image',
  'file',
  'reference',
  'slug',
  'geopoint',
  'headingText',
  'blockContent',
  'link',
])
const TEXT_KINDS: ReadonlySet<string> = new Set(['string', 'text', 'url', 'date', 'datetime'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const reject = (code: RejectionCode, message: string): Rejection => ({ code, message })

/** One operation on one path, before it is checked. */
interface Unit extends PatchUnit {
  operation: 'set' | 'unset' | 'insert' | 'unsupported'
  /** `set`: the value. `insert`: the items and position. */
  value?: unknown
  position?: { where: InsertPosition; target: string }
}

interface Inspection {
  part: ProposalPart
  reasons: Rejection[]
  warnings: string[]
  review: boolean
  /** The section the unit changes (its `_key`), for the panel and capability checks. */
  sectionKey?: string
  /** Capability and content-source fields the value sets, judged once the layout is known. */
  marked: MarkedField[]
  /** The name of the top-level field it changes, for attributing a contrast failure. */
  field?: string
}

/** A set of manifest rows to check values against: a section's, or Brand colours'. */
interface Scope {
  rows: Map<string, ManifestField>
  section?: ManifestSection
  slots: ManifestSlot[]
  /** The part of the document the scope's paths are relative to. */
  fragment: unknown
}

const exists = (scope: Scope, path: string) =>
  scope.rows.has(path) ||
  [...scope.rows.keys()].some((key) => key.startsWith(`${path}.`) || key.startsWith(`${path}[`))

function majorOf(version: string): string {
  return version.split('.')[0] ?? ''
}

/** Why the proposal as a whole cannot be used, or an empty list. */
function checkShape(proposal: unknown): Rejection[] {
  const problems: string[] = []
  if (!isRecord(proposal)) return [reject('invalid-proposal', 'A proposal must be a JSON object.')]
  for (const field of ['id', 'manifestVersion', 'intent', 'rationale'] as const) {
    if (typeof proposal[field] !== 'string' || proposal[field] === '') {
      problems.push(`"${field}" must be a non-empty string.`)
    }
  }
  if (!['section', 'page', 'site'].includes(String(proposal.scope))) {
    problems.push('"scope" must be "section", "page" or "site".')
  }
  if (!Array.isArray(proposal.changes) || proposal.changes.length === 0) {
    problems.push('"changes" must be a list with at least one change.')
  } else {
    proposal.changes.forEach((change: unknown, index) => {
      if (
        !isRecord(change) ||
        typeof change.documentId !== 'string' ||
        typeof change.baseRev !== 'string' ||
        !Array.isArray(change.patches) ||
        !change.patches.every(isRecord)
      ) {
        problems.push(
          `changes[${index}] needs a documentId, a baseRev and a list of patch objects.`,
        )
      }
    })
  }
  return problems.map((message) => reject('invalid-proposal', message))
}

/** Splits every patch into one unit per operation and path. */
function explode(proposal: ChangeProposal): Unit[] {
  const units: Unit[] = []
  for (const change of proposal.changes) {
    const base = {
      documentId: change.documentId,
      baseRev: change.baseRev,
      part: 'content' as const,
    }
    for (const patch of change.patches) {
      for (const [path, value] of Object.entries(patch.set ?? {})) {
        units.push({ ...base, operation: 'set', path, value, patch: { set: { [path]: value } } })
      }
      for (const path of patch.unset ?? []) {
        units.push({ ...base, operation: 'unset', path, patch: { unset: [path] } })
      }
      if (patch.insert) {
        const where = (['before', 'after', 'replace'] as const).find(
          (key) => typeof patch.insert?.[key] === 'string',
        )
        const target = where ? (patch.insert[where] ?? '') : ''
        units.push({
          ...base,
          operation: 'insert',
          path: target,
          value: patch.insert.items,
          position: { where: where ?? 'after', target },
          patch: { insert: patch.insert },
        })
      }
      for (const key of Object.keys(patch).filter((k) => !['set', 'unset', 'insert'].includes(k))) {
        units.push({
          ...base,
          operation: 'unsupported',
          path: key,
          patch: { [key]: 1 },
        })
      }
    }
  }
  return units
}

function sectionScope(
  manifest: DesignManifest,
  section: ManifestSection,
  fragment: unknown,
): Scope {
  const rows = new Map(section.fields.map((row) => [row.path, row]))
  // The manifest lists the shared section style once; every field typed as one carries its rows.
  for (const field of section.fields.filter((row) => row.kind === 'sectionStyle')) {
    for (const row of manifest.sectionStyle.fields) {
      rows.set(`${field.path}.${row.path}`, { ...row, clientEditable: field.clientEditable })
    }
  }
  return { rows, section, slots: manifest.slots, fragment }
}

/**
 * The manifest path of `segments` inside the scope's fragment: keyed and indexed array members become
 * `[type]` (or `[]` where the field holds one type). Null when an array member isn't in the document.
 */
function manifestPath(scope: Scope, segments: readonly PathSegment[]): string | null {
  let path = ''
  let current: unknown = scope.fragment
  for (const segment of segments) {
    if (segment.kind === 'field') {
      path = path ? `${path}.${segment.name}` : segment.name
      current = isRecord(current) ? current[segment.name] : undefined
      continue
    }
    const member = getAt(current, [segment])
    if (member === undefined) return null
    const type = isRecord(member) ? member._type : undefined
    const typed = typeof type === 'string' ? `${path}[${type}]` : undefined
    path = typed && exists(scope, typed) ? typed : `${path}[]`
    current = member
  }
  return path
}

interface ValueCheck {
  scope: Scope
  problems: Rejection[]
  /** The rows the value touches, for the permission check. */
  touched: ManifestField[]
  /** The touched rows that are a shared design capability or feed a content source, with their paths. */
  marked: MarkedField[]
}

/** The block types the slot at `arrayPath` accepts, or undefined when the array isn't a slot. */
function slotBlocks(scope: Scope, arrayPath: string): Set<string> | undefined {
  const name = scope.section?.slots?.find((entry) => entry.path === arrayPath)?.slot
  const slot = scope.slots.find((entry) => entry.slot === name)
  return slot ? new Set(slot.blocks.map((block) => block.type)) : undefined
}

function checkMembers(
  check: ValueCheck,
  arrayPath: string,
  items: readonly unknown[],
  slotTypes?: Set<string>,
) {
  for (const item of items) {
    const type = isRecord(item) && typeof item._type === 'string' ? item._type : undefined
    if (slotTypes && (!type || !slotTypes.has(type))) {
      check.problems.push(
        reject(
          'slot-block-not-allowed',
          `${type ? `"${type}"` : 'An item with no _type'} is not an allowed block in ${arrayPath}. Allowed: ${[...slotTypes].join(', ')}.`,
        ),
      )
      continue
    }
    const typed = type ? `${arrayPath}[${type}]` : undefined
    const member = typed && exists(check.scope, typed) ? typed : `${arrayPath}[]`
    if (!exists(check.scope, member)) {
      check.problems.push(
        reject(
          'unknown-path',
          `${type ? `"${type}"` : 'This'} is not an item type ${arrayPath} accepts.`,
        ),
      )
      continue
    }
    checkValue(check, member, item)
  }
}

/** Checks `value` against the row at `path` (and, for objects and arrays, the rows below it). */
function checkValue(check: ValueCheck, path: string, value: unknown) {
  const { scope, problems } = check
  const row = scope.rows.get(path)
  if (row) check.touched.push(row)
  if (value === null || value === undefined) {
    problems.push(reject('value-not-allowed', `${path} cannot be null: unset it to inherit.`))
    return
  }
  if (row && (row.capability || row.contentSource)) check.marked.push({ path, row })

  if (Array.isArray(value)) {
    if (row && row.kind !== 'array' && !OPAQUE_KINDS.has(row.kind)) {
      problems.push(reject('value-not-allowed', `${path} is a ${row.kind}, not a list.`))
      return
    }
    if (typeof row?.max === 'number' && value.length > row.max) {
      problems.push(
        reject('limit-exceeded', `${path} holds at most ${row.max}; this has ${value.length}.`),
      )
    }
    if (row?.kind === 'array') checkMembers(check, path, value, slotBlocks(scope, path))
    return
  }

  if (isRecord(value)) {
    if (row && (TEXT_KINDS.has(row.kind) || ['boolean', 'number'].includes(row.kind))) {
      problems.push(reject('value-not-allowed', `${path} is a ${row.kind}, not an object.`))
      return
    }
    if (row && OPAQUE_KINDS.has(row.kind)) return
    for (const [key, child] of Object.entries(value)) {
      if (key === '_type' || key === '_key') continue
      const childPath = `${path}.${key}`
      if (!scope.rows.has(childPath)) {
        problems.push(reject('unknown-path', `${childPath} is not a field the manifest knows.`))
        continue
      }
      checkValue(check, childPath, child)
    }
    return
  }

  if (!row) {
    problems.push(reject('unknown-path', `${path} is not a field the manifest knows.`))
    return
  }
  if (TEXT_KINDS.has(row.kind) && typeof value !== 'string') {
    problems.push(reject('value-not-allowed', `${path} takes text; got ${typeof value}.`))
    return
  }
  if (row.kind === 'boolean' && typeof value !== 'boolean') {
    problems.push(reject('value-not-allowed', `${path} takes true or false; got ${typeof value}.`))
    return
  }
  if (row.kind === 'number' && typeof value !== 'number') {
    problems.push(reject('value-not-allowed', `${path} takes a number; got ${typeof value}.`))
    return
  }
  if (row.list && !row.list.some((entry) => entry.value === value)) {
    problems.push(
      reject(
        'value-not-allowed',
        `${JSON.stringify(value)} is not an option for ${path}. Options: ${row.list.map((entry) => String(entry.value)).join(', ')}.`,
      ),
    )
  }
  if (typeof value === 'string' && typeof row.max === 'number' && value.length > row.max) {
    problems.push(
      reject(
        'limit-exceeded',
        `${path} holds at most ${row.max} characters; this has ${value.length}.`,
      ),
    )
  }
}

/**
 * Sorts a unit into a part from where it lands: a style, an image design, one of the look fields, or a
 * row the manifest says is a design object (`design: true`, such as a link's own Appearance).
 */
function partOf(
  scope: Scope | undefined,
  topField: string | undefined,
  designDocument: boolean,
  row?: ManifestField,
) {
  if (designDocument) return 'design'
  if (!scope || !topField) return 'content'
  if (row?.design === true) return 'design'
  const kind = scope.rows.get(topField)?.kind ?? ''
  return DESIGN_KINDS.has(kind) || DESIGN_FIELDS.has(topField) || topField.endsWith('Design')
    ? 'design'
    : 'content'
}

/**
 * The rows above `segments` that are a shared design capability or feed a content source. A value
 * inside a marked object (`cardDesign.label.size`, `dividerDesign.afterProfile.style`) is judged by the
 * object's own marker too, so a nested path is never a way round it.
 */
function markedAncestors(scope: Scope, segments: readonly PathSegment[]): MarkedField[] {
  const found: MarkedField[] = []
  for (let end = 1; end < segments.length; end++) {
    const path = manifestPath(scope, segments.slice(0, end))
    const row = path === null ? undefined : scope.rows.get(path)
    if (path !== null && row && (row.capability || row.contentSource)) found.push({ path, row })
  }
  return found
}

function inspect(unit: Unit, deps: ValidateDeps): Inspection {
  const { manifest, documents } = deps
  const editable = deps.isClientEditable ?? registryIsClientEditable
  const result: Inspection = {
    part: 'content',
    reasons: [],
    warnings: [],
    review: false,
    marked: [],
  }
  const fail = (code: RejectionCode, message: string) => {
    result.reasons.push(reject(code, message))
    return result
  }

  const document = documents[unit.documentId]
  if (unit.operation === 'unsupported') {
    return fail(
      'unsupported-operation',
      `"${unit.path}" is not supported: patches may use set, unset and insert only.`,
    )
  }
  if (!document) {
    return fail(
      'unknown-document',
      `Document ${unit.documentId} was not found, so the change cannot be checked.`,
    )
  }
  if (document._rev !== unit.baseRev) {
    result.reasons.push(
      reject(
        'stale-revision',
        `The proposal was made from revision ${unit.baseRev}, but ${unit.documentId} is now at ${document._rev}. Propose again from the new revision.`,
      ),
    )
  }

  const designDocument = document._type === 'designSettings'
  if (!designDocument && document._type !== 'page') {
    return fail(
      'unknown-document',
      `The design manifest describes pages and Brand colours only, not ${document._type} documents.`,
    )
  }

  const segments = parsePath(unit.path)
  if (!segments) {
    return fail('invalid-path', `"${unit.path}" is not a path change proposals support.`)
  }
  // An insert names an array position; the array is the path without its last segment.
  const target = unit.operation === 'insert' ? segments.slice(0, -1) : segments
  const positionOk = unit.operation !== 'insert' || segments[segments.length - 1]?.kind !== 'field'
  if (!positionOk || target.length === 0) {
    return fail(
      'invalid-path',
      `"${unit.path}" must name an array position such as items[-1] or items[_key=="a1"].`,
    )
  }

  // Which rows apply: Brand colours' own, or those of the page section the path enters.
  let scope: Scope
  let relative: PathSegment[]
  if (designDocument) {
    scope = {
      rows: new Map(manifest.designSettings.fields.map((row) => [row.path, row])),
      slots: manifest.slots,
      fragment: document,
    }
    relative = target
  } else {
    const head = target[0]
    if (head?.kind !== 'field' || head.name !== 'pageBuilder') {
      return fail(
        'unknown-path',
        `${unit.path} is not in a page's sections: the manifest describes pageBuilder only.`,
      )
    }
    result.review = !editable('page', 'pageBuilder')
    if (target.length === 1) {
      if (unit.operation !== 'insert') {
        return fail(
          'unknown-path',
          'Change a section, or insert one with insert, rather than setting the whole pageBuilder.',
        )
      }
      return checkSectionInsert(unit, manifest, result)
    }
    const sectionValue = getAt(document, target.slice(0, 2))
    const sectionType = isRecord(sectionValue) ? sectionValue._type : undefined
    const section = manifest.sections.find((entry) => entry.type === sectionType)
    if (!isRecord(sectionValue) || !section) {
      return fail(
        'unknown-path',
        `${unit.path} does not name a section in ${unit.documentId} that the manifest describes.`,
      )
    }
    result.sectionKey = typeof sectionValue._key === 'string' ? sectionValue._key : undefined
    scope = sectionScope(manifest, section, sectionValue)
    relative = target.slice(2)
  }

  // The whole section: removing it (unset) or replacing it (set) is a content change.
  if (relative.length === 0) {
    if (unit.operation === 'unset') return result
    return fail('unknown-path', 'Change the fields of a section, or remove it with unset.')
  }

  const path = manifestPath(scope, relative)
  const first = relative[0]
  result.field = first?.kind === 'field' ? first.name : undefined
  result.part = partOf(scope, result.field, designDocument, path ? scope.rows.get(path) : undefined)
  if (path === null || !exists(scope, path)) {
    return fail(
      'unknown-path',
      `${unit.path} is not a field the manifest knows${scope.section ? ` for a ${scope.section.type} section` : ''}.`,
    )
  }

  const check: ValueCheck = { scope, problems: result.reasons, touched: [], marked: [] }
  const top = result.field ? scope.rows.get(result.field) : undefined
  if (top) check.touched.push(top)

  if (unit.operation === 'set') {
    // The value's own markers (checkValue) and those of the objects it sits inside: all must pass.
    check.marked.push(...markedAncestors(scope, relative))
    checkValue(check, path, unit.value)
  } else if (unit.operation === 'unset') {
    const row = scope.rows.get(path)
    if (row) check.touched.push(row)
    if (row?.required === true) {
      fail('value-not-allowed', `${path} is required, so it cannot be unset.`)
    }
  } else {
    const row = scope.rows.get(path)
    const items = Array.isArray(unit.value) ? unit.value : []
    if (row?.kind !== 'array') {
      fail(
        'unknown-path',
        `${path} is not a list the manifest knows, so nothing can be inserted into it.`,
      )
    } else {
      check.touched.push(row)
      // An insert changes the array itself, so a marked array (a slot) is judged, as well as its ancestors.
      check.marked.push(...markedAncestors(scope, relative))
      if (row.capability || row.contentSource) check.marked.push({ path, row })
      const current = getAt(scope.fragment, relative)
      const length = Array.isArray(current) ? current.length : 0
      const replaced = unit.position?.where === 'replace' ? 1 : 0
      if (typeof row.max === 'number' && length + items.length - replaced > row.max) {
        fail(
          'limit-exceeded',
          `${path} holds at most ${row.max}; it has ${length} and this would make ${length + items.length - replaced}.`,
        )
      }
      checkMembers(check, path, items, slotBlocks(scope, path))
    }
  }
  result.review = result.review || check.touched.some((row) => !row.clientEditable)
  result.marked = check.marked
  return result
}

/** What judges a field inside a slot block: the slots, and each block's own contract. */
const blockContext = (manifest: DesignManifest) => ({
  slots: manifest.slots,
  slotBlocks: manifest.designCapabilities?.slotBlocks,
})

/** Inserting whole sections into pageBuilder: each must be a section type the manifest describes. */
function checkSectionInsert(unit: Unit, manifest: DesignManifest, result: Inspection): Inspection {
  const items = Array.isArray(unit.value) ? unit.value : []
  for (const item of items) {
    const type = isRecord(item) ? item._type : undefined
    const section = manifest.sections.find((entry) => entry.type === type)
    if (!isRecord(item) || !section) {
      result.reasons.push(
        reject(
          'unknown-path',
          `${typeof type === 'string' ? `"${type}"` : 'An item with no _type'} is not a section type the manifest describes.`,
        ),
      )
      continue
    }
    const check: ValueCheck = {
      scope: sectionScope(manifest, section, item),
      problems: result.reasons,
      touched: [],
      marked: [],
    }
    for (const [key, value] of Object.entries(item)) {
      if (key === '_type' || key === '_key') continue
      if (!check.scope.rows.has(key)) {
        result.reasons.push(
          reject('unknown-path', `${key} is not a field of a ${section.type} section.`),
        )
        continue
      }
      checkValue(check, key, value)
    }
    // A section inserted whole is judged in the layout it brings, else its default.
    for (const verdict of capabilityVerdicts(
      section,
      layoutOfSection(section, item.variant),
      check.marked,
      blockContext(manifest),
    )) {
      result.reasons.push(reject(verdict.code, verdict.message))
    }
    result.review = result.review || check.touched.some((row) => !row.clientEditable)
  }
  return result
}

/**
 * The document after `unit`, for checks that need the result (limits are checked before; this is for
 * design). A set creates the object fields it goes through, as the plan will (plan.ts); an unset of a
 * value that isn't there changes nothing. Throws when a set or an insert has nowhere to land.
 */
function applyUnit(document: DocumentSnapshot, unit: Unit): DocumentSnapshot {
  const segments = parsePath(unit.path)
  if (!segments) return document
  if (unit.operation === 'set') return setCreatingParents(document, segments, unit.value)
  if (unit.operation === 'unset') return unsetAt(document, segments)
  if (unit.operation === 'insert' && unit.position && Array.isArray(unit.value)) {
    return insertAt(document, segments, unit.position.where, unit.value)
  }
  return document
}

/**
 * The document after `units`, in order. A unit that can't be applied (a set or an insert through a
 * parent that is missing and can't be created, or isn't an object or a list) is rejected, never
 * skipped: a skipped unit would be accepted without the checks that read the result, and the write would
 * then fail or land somewhere unchecked. A rejected unit is left out of the result.
 */
function applyUnits(
  document: DocumentSnapshot,
  units: { unit: Unit; inspection: Inspection }[],
): DocumentSnapshot {
  let patched = document
  for (const { unit, inspection } of units) {
    try {
      patched = applyUnit(patched, unit)
    } catch (error) {
      const message = `${unit.path} can't be applied to ${unit.documentId}: ${error instanceof Error ? error.message : 'it goes through something that is missing or is not an object or list'} The proposal can't set or insert through a parent that isn't there and can't be created.`
      if (!inspection.reasons.some((reason) => reason.message === message)) {
        inspection.reasons.push(reject('invalid-path', message))
      }
    }
  }
  return patched
}

interface Entry {
  unit: Unit
  inspection: Inspection
}

/**
 * The document after `entries`, in order, as the one `subject` is judged in. A unit that can't be
 * applied (a set or an insert through a parent that is missing and can't be created, or isn't an object
 * or list) is rejected, never skipped: a skipped unit would be accepted without the checks that read the
 * result, and the write would then fail or land somewhere unchecked. Only the subject's own failure is
 * recorded here; another unit that can't land in this world is judged in its own.
 */
function applyWorld(
  document: DocumentSnapshot,
  entries: readonly Entry[],
  subject: Entry,
): DocumentSnapshot {
  let patched = document
  for (const entry of entries) {
    try {
      patched = applyUnit(patched, entry.unit)
    } catch (error) {
      if (entry !== subject) continue
      const message = `${entry.unit.path} can't be applied to ${entry.unit.documentId}: ${error instanceof Error ? error.message : 'it goes through something that is missing or is not an object or list'} The proposal can't set or insert through a parent that isn't there and can't be created.`
      if (!entry.inspection.reasons.some((reason) => reason.message === message)) {
        entry.inspection.reasons.push(reject('invalid-path', message))
      }
    }
  }
  return patched
}

/**
 * Capability and content-source fields, judged in the world that will really be written (I4): each value
 * must be verified for the layout its section is drawn in once the changes that will land are applied.
 * A part with any rejection writes nothing, so another part's changes are only counted where that part
 * still applies: a layout change in a design part that is rejected never lands, and a link inserted in a
 * content part that is rejected is never there to give a design to. The subject's own part is judged as
 * if it lands (if it can't, it is rejected anyway). Reasons are only ever added, so this settles.
 */
function judgeInWorld(
  document: DocumentSnapshot,
  entries: readonly Entry[],
  subject: Entry,
  live: Readonly<Record<ProposalPart, boolean>>,
  deps: ValidateDeps,
) {
  const world = entries.filter(
    (entry) =>
      entry === subject ||
      (entry.inspection.reasons.length === 0 &&
        (entry.inspection.part === subject.inspection.part || live[entry.inspection.part])),
  )
  const patched = applyWorld(document, world, subject)
  const { inspection } = subject
  if (inspection.reasons.length > 0) return
  if (inspection.marked.length === 0 || !inspection.sectionKey) return
  const sections = Array.isArray(patched.pageBuilder) ? (patched.pageBuilder as unknown[]) : []
  const section = sections.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && item._key === inspection.sectionKey,
  )
  const entry = deps.manifest.sections.find((candidate) => candidate.type === section?._type)
  if (!section || !entry) {
    // Not found once the changes that will land are applied: its values can't be checked, so they're rejected.
    inspection.reasons.push(
      reject(
        'invalid-path',
        `The section this change is to can't be found once the proposal's other changes that will be written are applied, so its design values can't be checked.`,
      ),
    )
    return
  }
  for (const verdict of capabilityVerdicts(
    entry,
    layoutOfSection(entry, section.variant),
    inspection.marked,
    blockContext(deps.manifest),
  )) {
    inspection.reasons.push(reject(verdict.code, verdict.message))
  }
}

/** Brand colours: a change that makes a text pair newly fail is rejected, on the units that touch it. */
function checkBrandContrast(
  document: DocumentSnapshot,
  units: { unit: Unit; inspection: Inspection }[],
) {
  const patched = applyUnits(document, units)
  const before = new Set(
    resolveDesignTokens(document as DesignOverrides)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id),
  )
  const failing = resolveDesignTokens(patched as DesignOverrides).checks.filter(
    (c) => !c.pass && !before.has(c.id),
  )
  for (const check of failing) {
    const message = `${check.label} would be ${check.ratio.toFixed(1)}:1; it needs ${check.required}:1. Choose ${check.fields.join(' and ')} again.`
    const named = units.filter(
      ({ inspection }) => inspection.field && check.fields.includes(inspection.field),
    )
    for (const { inspection } of named.length > 0 ? named : units) {
      inspection.reasons.push(reject('contrast-fails', message))
    }
  }
}

/** Section panels: a panel that cannot be made readable falls back to solid, so it is only a warning. */
function checkPanels(
  document: DocumentSnapshot,
  units: { unit: Unit; inspection: Inspection }[],
  deps: ValidateDeps,
) {
  const patched = applyUnits(document, units)
  const site = deps.documents.designSettings
    ? resolveDesignTokens(deps.documents.designSettings as DesignOverrides).colours
    : undefined
  for (const { inspection } of units) {
    if (!inspection.sectionKey || !inspection.field?.startsWith('style')) continue
    const section = (patched.pageBuilder as unknown[] | undefined)?.find(
      (item): item is Record<string, unknown> =>
        isRecord(item) && item._key === inspection.sectionKey,
    )
    const style = isRecord(section?.style) ? section.style : undefined
    if (!section || !style?.panel) continue
    const rule = deps.manifest.sections
      .find((entry) => entry.type === section._type)
      ?.rules.find((entry) => entry.variant === (section.variant ?? null))
    const message = panelProblem({
      panel: asText(style.panel),
      strength: asText(style.panelStrength),
      tone: asText(style.tone),
      gradient: asText(style.gradient),
      hasPicture: Boolean(rule?.hasPicture) || isRecord(style.image),
      site,
    })
    if (message) inspection.warnings.push(message)
  }
}

const asText = (value: unknown) => (typeof value === 'string' ? value : undefined)

function emptyPart(): PartResult {
  return { accepted: [], rejected: [], applies: false }
}

/**
 * Validates `proposal` against the manifest and the documents it was made from. Never throws on a bad
 * proposal: the reasons are in the result.
 */
export function validateProposal(proposal: unknown, deps: ValidateDeps): ProposalValidation {
  const proposalId = isRecord(proposal) && typeof proposal.id === 'string' ? proposal.id : '(no id)'
  const result: ProposalValidation = {
    proposalId,
    content: emptyPart(),
    design: emptyPart(),
    accepted: [],
    rejected: [],
    applicable: [],
    needsAgencyReview: false,
  }

  const shape = checkShape(proposal)
  if (shape.length > 0) return { ...result, rejection: shape }
  const typed = proposal as ChangeProposal
  if (majorOf(typed.manifestVersion) !== majorOf(deps.manifest.manifestVersion)) {
    return {
      ...result,
      rejection: [
        reject(
          'manifest-mismatch',
          `The proposal was made for manifest ${typed.manifestVersion}; this site is on ${deps.manifest.manifestVersion}. Propose again against the current manifest.`,
        ),
      ],
    }
  }

  const inspected = explode(typed).map((unit) => ({ unit, inspection: inspect(unit, deps) }))

  // A client-level run can't write what clients may not edit. This is a rejection like any other, made
  // before the checks that read what will be written: a layout change it rejects never lands, so what
  // depends on it is judged without it.
  if (deps.agencyPermitted === false) {
    for (const { unit, inspection } of inspected) {
      if (inspection.review && inspection.reasons.length === 0) {
        inspection.reasons.push(
          reject(
            'agency-permission-required',
            `${unit.path} changes something clients may not edit. It needs a token held by an Administrator or Developer.`,
          ),
        )
      }
    }
  }

  // Brand colours are read as one document, so every set must have somewhere to land before the contrast
  // is judged. (A page's units are each judged in the world that will be written, below: a unit that
  // can't land there is rejected there, and one that only fails because of a change that won't be
  // written is not.)
  for (const documentId of new Set(inspected.map((entry) => entry.unit.documentId))) {
    const document = deps.documents[documentId]
    if (document?._type !== 'designSettings') continue
    applyUnits(
      document,
      inspected.filter(
        (entry) => entry.unit.documentId === documentId && entry.inspection.reasons.length === 0,
      ),
    )
  }

  // What will be written is the accepted units of the parts that apply (a part with a rejection writes
  // nothing). Judge every unit in that world: capability and content-source values against the layout
  // the section really ends up in, Brand colours for contrast. A rejection can stop a part applying,
  // which changes the world the other part is judged in, so repeat until nothing new is rejected. A
  // reason is never removed, so this settles; if it somehow does not, fail closed.
  const partApplies = (part: ProposalPart) => {
    const own = inspected.filter((entry) => entry.inspection.part === part)
    return own.length > 0 && own.every((entry) => entry.inspection.reasons.length === 0)
  }
  const reasonCount = () =>
    inspected.reduce((total, entry) => total + entry.inspection.reasons.length, 0)
  const documentIds = [...new Set(inspected.map((entry) => entry.unit.documentId))]
  const maxRounds = deps.maxRounds ?? 8
  let settled = false
  for (let round = 0; round < maxRounds && !settled; round++) {
    const before = reasonCount()
    const live = { content: partApplies('content'), design: partApplies('design') }
    for (const documentId of documentIds) {
      const document = deps.documents[documentId]
      const entries = inspected.filter((entry) => entry.unit.documentId === documentId)
      if (document?._type === 'page') {
        for (const subject of entries) {
          if (subject.inspection.reasons.length === 0) {
            judgeInWorld(document, entries, subject, live, deps)
          }
        }
      } else if (document?._type === 'designSettings') {
        checkBrandContrast(
          document,
          entries.filter((entry) => entry.inspection.reasons.length === 0),
        )
      }
    }
    settled = reasonCount() === before
  }
  if (!settled) {
    for (const { inspection } of inspected) {
      if (inspection.reasons.length > 0) continue
      inspection.reasons.push(
        reject(
          'proposal-unstable',
          `The changes in this proposal depend on each other in a way that didn't settle after ${String(maxRounds)} checks, so none of it is accepted. Split it into smaller proposals.`,
        ),
      )
    }
  }

  // Panels warn, never reject: read from the design changes that are still acceptable.
  const byDocument = new Map<string, typeof inspected>()
  for (const entry of inspected) {
    if (entry.inspection.part !== 'design' || entry.inspection.reasons.length > 0) continue
    byDocument.set(entry.unit.documentId, [...(byDocument.get(entry.unit.documentId) ?? []), entry])
  }
  for (const [documentId, entries] of byDocument) {
    const document = deps.documents[documentId]
    if (document?._type === 'page') checkPanels(document, entries, deps)
  }

  for (const { unit, inspection } of inspected) {
    const part = result[inspection.part]
    const base: PatchUnit = {
      documentId: unit.documentId,
      baseRev: unit.baseRev,
      part: inspection.part,
      patch: unit.patch,
      path: unit.path,
    }
    if (inspection.reasons.length > 0) {
      const rejected: RejectedPatch = { ...base, reasons: inspection.reasons }
      part.rejected.push(rejected)
    } else {
      const accepted: AcceptedPatch = {
        ...base,
        needsAgencyReview: inspection.review,
        warnings: inspection.warnings,
      }
      part.accepted.push(accepted)
    }
  }
  for (const part of [result.content, result.design]) {
    part.applies = part.rejected.length === 0 && part.accepted.length > 0
    result.accepted.push(...part.accepted)
    result.rejected.push(...part.rejected)
    if (part.applies) result.applicable.push(...part.accepted)
  }
  result.needsAgencyReview = result.applicable.some((patch) => patch.needsAgencyReview)
  return result
}
