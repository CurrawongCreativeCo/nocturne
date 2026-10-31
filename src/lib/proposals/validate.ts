import { resolveDesignTokens, type DesignOverrides } from '@/lib/color/resolve-design-tokens'
import { isClientEditable as registryIsClientEditable } from '@/lib/sanity/client-editable'
import { panelProblem } from '@/lib/sanity/section-panel'

import {
  getAt,
  insertAt,
  parsePath,
  setAt,
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
 * 4. Permissions: a change to anything clients may not edit (CLIENT_EDITABLE, through the manifest)
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
  /** The section the unit changes (its `_key`), for the panel check. */
  sectionKey?: string
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

/** Sorts a unit into a part from where it lands: a style, an image design, or one of the look fields. */
function partOf(scope: Scope | undefined, topField: string | undefined, designDocument: boolean) {
  if (designDocument) return 'design'
  if (!scope || !topField) return 'content'
  const kind = scope.rows.get(topField)?.kind ?? ''
  return DESIGN_KINDS.has(kind) || DESIGN_FIELDS.has(topField) || topField.endsWith('Design')
    ? 'design'
    : 'content'
}

function inspect(unit: Unit, deps: ValidateDeps): Inspection {
  const { manifest, documents } = deps
  const editable = deps.isClientEditable ?? registryIsClientEditable
  const result: Inspection = { part: 'content', reasons: [], warnings: [], review: false }
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
  result.part = partOf(scope, result.field, designDocument)
  if (path === null || !exists(scope, path)) {
    return fail(
      'unknown-path',
      `${unit.path} is not a field the manifest knows${scope.section ? ` for a ${scope.section.type} section` : ''}.`,
    )
  }

  const check: ValueCheck = { scope, problems: result.reasons, touched: [] }
  const top = result.field ? scope.rows.get(result.field) : undefined
  if (top) check.touched.push(top)

  if (unit.operation === 'set') {
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
  return result
}

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
    result.review = result.review || check.touched.some((row) => !row.clientEditable)
  }
  return result
}

/** The document after `unit`, for checks that need the result (limits are checked before; this is for design). */
function applyUnit(document: DocumentSnapshot, unit: Unit): DocumentSnapshot {
  const segments = parsePath(unit.path)
  if (!segments) return document
  if (unit.operation === 'set') return setAt(document, segments, unit.value)
  if (unit.operation === 'unset') return unsetAt(document, segments)
  if (unit.operation === 'insert' && unit.position && Array.isArray(unit.value)) {
    return insertAt(document, segments, unit.position.where, unit.value)
  }
  return document
}

/** Brand colours: a change that makes a text pair newly fail is rejected, on the units that touch it. */
function checkBrandContrast(
  document: DocumentSnapshot,
  units: { unit: Unit; inspection: Inspection }[],
) {
  let patched = document
  for (const { unit } of units) {
    try {
      patched = applyUnit(patched, unit)
    } catch {
      return
    }
  }
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
  let patched = document
  for (const { unit } of units) {
    try {
      patched = applyUnit(patched, unit)
    } catch {
      return
    }
  }
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

  // Design checks run on what is still acceptable, per document, once the parts are separate.
  const byDocument = new Map<string, typeof inspected>()
  for (const entry of inspected) {
    if (entry.inspection.part !== 'design' || entry.inspection.reasons.length > 0) continue
    byDocument.set(entry.unit.documentId, [...(byDocument.get(entry.unit.documentId) ?? []), entry])
  }
  for (const [documentId, entries] of byDocument) {
    const document = deps.documents[documentId]
    if (!document) continue
    if (document._type === 'designSettings') {
      checkBrandContrast(document, entries)
    } else if (document._type === 'page') {
      checkPanels(document, entries, deps)
    }
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
      if (inspection.review && deps.agencyPermitted === false) {
        part.rejected.push({
          ...base,
          reasons: [
            reject(
              'agency-permission-required',
              `${unit.path} changes something clients may not edit. It needs a token held by an Administrator or Developer.`,
            ),
          ],
        })
        continue
      }
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
