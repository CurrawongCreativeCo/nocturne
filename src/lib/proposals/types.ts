/**
 * Change proposals (design engine architecture, §6.2): data only, never code. Produced by a person, a
 * script or a model; checked by `validateProposal` and written, as drafts only, by
 * scripts/proposal.mjs. README, "Change proposals" describes the format for people.
 */

/** A Sanity patch's operations, with paths in Sanity's path syntax (`pageBuilder[_key=="a1"].style.panel`). */
export interface SanityPatch {
  set?: Record<string, unknown>
  unset?: string[]
  insert?: {
    before?: string
    after?: string
    replace?: string
    items: unknown[]
  }
}

export interface ProposedChange {
  /** The published id; the proposal is applied to its draft. */
  documentId: string
  /** The revision the proposal was made from. A stale proposal fails instead of overwriting newer work. */
  baseRev: string
  /** set / unset / insert, using paths the manifest knows. */
  patches: SanityPatch[]
}

/** A proposed change: data only, never code. Produced by a person, a script or a model. */
export interface ChangeProposal {
  id: string
  /** The template version the proposal was made against. */
  manifestVersion: string
  /** The original instruction, kept for the record. */
  intent: string
  scope: 'section' | 'page' | 'site'
  changes: ProposedChange[]
  /** Shown to the reviewer. */
  rationale: string
  /** What couldn't be represented (Experience A). */
  gaps?: string[]
}

/** Content and design are validated, and fail, separately (architecture §5). */
export type ProposalPart = 'content' | 'design'

export type RejectionCode =
  | 'invalid-proposal'
  | 'manifest-mismatch'
  | 'invalid-path'
  | 'unsupported-operation'
  | 'unknown-document'
  | 'stale-revision'
  | 'unknown-path'
  | 'value-not-allowed'
  | 'limit-exceeded'
  | 'slot-block-not-allowed'
  | 'contrast-fails'
  | 'agency-permission-required'

export interface Rejection {
  code: RejectionCode
  message: string
}

/** One operation on one path: the unit that is accepted or rejected. */
export interface PatchUnit {
  documentId: string
  baseRev: string
  part: ProposalPart
  /** A patch with a single operation on a single path. */
  patch: SanityPatch
  /** The path the operation targets, as written in the proposal. */
  path: string
}

export interface AcceptedPatch extends PatchUnit {
  /** The change touches something clients may not edit (CLIENT_EDITABLE), so the agency reviews it. */
  needsAgencyReview: boolean
  /** Problems that don't block the change (a panel that falls back to a safe look). */
  warnings: string[]
}

export interface RejectedPatch extends PatchUnit {
  reasons: Rejection[]
}

export interface PartResult {
  accepted: AcceptedPatch[]
  rejected: RejectedPatch[]
  /**
   * Whether the part may be written: it has at least one patch and none was rejected. A part with a
   * rejection writes nothing at all, so a half-applied design change cannot happen.
   */
  applies: boolean
}

export interface ProposalValidation {
  proposalId: string
  /** Set when the proposal as a whole is unusable (wrong shape, wrong manifest); both parts are then empty. */
  rejection?: Rejection[]
  content: PartResult
  design: PartResult
  /** Every accepted patch, both parts. */
  accepted: AcceptedPatch[]
  /** Every rejected patch, both parts. */
  rejected: RejectedPatch[]
  /** The patches the applier writes: the accepted ones of parts that apply. */
  applicable: AcceptedPatch[]
  needsAgencyReview: boolean
}

/** The document as the validator and applier see it: the draft when there is one, else the published one. */
export interface DocumentSnapshot {
  _id: string
  _type: string
  _rev: string
  [field: string]: unknown
}

/** One row of design-manifest.generated.json: a field of a section, block or document. */
export interface ManifestField {
  path: string
  kind: string
  required: boolean | null
  /** A number (text length or item count), absent when the field has no maximum, null when unknown. */
  max?: number | null
  list?: { value: string | number; title: string }[]
  clientEditable: boolean
}

export interface ManifestSection {
  type: string
  fields: ManifestField[]
  variants?: { value: string; title: string }[]
  slots?: { slot: string; path: string }[]
  rules: { variant: string | null; hasPicture: boolean }[]
}

export interface ManifestSlot {
  slot: string
  max: number
  blocks: { type: string; clientEditable: boolean }[]
}

/** The slice of the generated manifest the validator reads. */
export interface DesignManifest {
  manifestVersion: string
  slots: ManifestSlot[]
  sections: ManifestSection[]
  sectionStyle: { fields: ManifestField[] }
  designSettings: { fields: ManifestField[] }
}
