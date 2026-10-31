import { formatPath, getAt, parsePath } from './paths'
import type { AcceptedPatch, DocumentSnapshot } from './types'

/**
 * Turns the patches a validation accepted into the Sanity mutations that write them, as drafts only
 * (design engine architecture, §6.2, "Apply"). Pure: scripts/proposal.mjs sends what this returns.
 *
 * - The write goes to `drafts.<id>`, or to `versions.<release>.<id>` with a release; never to the
 *   published document, and nothing here publishes.
 * - Where a draft exists, its first patch carries `ifRevisionID: baseRev`, so a draft edited since the
 *   proposal was made makes the whole transaction fail instead of being overwritten.
 * - Where there is only the published document, the draft is made with `create`, which fails if
 *   someone else has made one in the meantime.
 */

export interface PatchMutation {
  patch: {
    id: string
    ifRevisionID?: string
    setIfMissing?: Record<string, unknown>
    set?: Record<string, unknown>
    unset?: string[]
    insert?: NonNullable<AcceptedPatch['patch']['insert']>
  }
}
export interface CreateMutation {
  create: Record<string, unknown>
}
export type ProposalMutation = PatchMutation | CreateMutation

/** One document the plan writes, with what is needed to undo it. */
export interface PlannedWrite {
  documentId: string
  /** The document's `_type`, for the undo guard. */
  documentType: string
  /** The id written to: `drafts.<id>` or `versions.<release>.<id>`. */
  targetId: string
  /** The draft did not exist, so undoing is deleting it. */
  created: boolean
  /** The draft as it was, when there was one; undoing restores it. */
  original?: DocumentSnapshot
}

export interface ProposalPlan {
  writes: PlannedWrite[]
  /** Actions API requests that must run first (release and version creation); empty without a release. */
  releaseActions: Record<string, unknown>[]
  mutations: ProposalMutation[]
}

export interface PlanOptions {
  /** The release to write into. Its id is the part after `versions.`, for example `rAbc123`. */
  release?: { id: string; title: string; description?: string }
}

const draftId = (id: string) => `drafts.${id}`

/** A copy of the document without the fields Sanity sets itself. */
function bare(document: DocumentSnapshot, id: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...document, _id: id }
  for (const field of ['_rev', '_createdAt', '_updatedAt']) Reflect.deleteProperty(copy, field)
  return copy
}

/**
 * The object paths a `set` needs to exist first: Sanity does not create missing parents, so each
 * absent one gets a `setIfMissing` of its own (outermost first).
 */
function missingParents(document: DocumentSnapshot, path: string): string[] {
  const segments = parsePath(path)
  if (!segments) return []
  const missing: string[] = []
  for (let end = 1; end < segments.length; end++) {
    const last = segments[end - 1]
    // Only object fields can be created; a missing array item is the proposal's mistake, not ours.
    if (last?.kind !== 'field' || segments[end]?.kind !== 'field') continue
    if (getAt(document, segments.slice(0, end)) !== undefined) continue
    missing.push(formatPath(segments.slice(0, end)))
  }
  return missing
}

export function planProposal(
  applicable: readonly AcceptedPatch[],
  documents: Readonly<Record<string, DocumentSnapshot>>,
  { release }: PlanOptions = {},
): ProposalPlan {
  const plan: ProposalPlan = { writes: [], releaseActions: [], mutations: [] }
  if (release) {
    plan.releaseActions.push({
      actionType: 'sanity.action.release.create',
      releaseId: release.id,
      metadata: {
        title: release.title,
        description: release.description ?? '',
        releaseType: 'undecided',
      },
    })
  }

  const order = [...new Set(applicable.map((patch) => patch.documentId))]
  for (const documentId of order) {
    const snapshot = documents[documentId]
    if (!snapshot) continue
    const hasDraft = snapshot._id === draftId(documentId)
    const targetId = release ? `versions.${release.id}.${documentId}` : draftId(documentId)
    const units = applicable.filter((patch) => patch.documentId === documentId)

    if (release) {
      plan.releaseActions.push({
        actionType: 'sanity.action.document.version.create',
        publishedId: documentId,
        document: bare(snapshot, targetId),
      })
    } else if (!hasDraft) {
      plan.mutations.push({ create: bare(snapshot, targetId) })
    }
    // Only a draft that already exists has a revision to guard; a release version is brand new.
    let guard = !release && hasDraft ? units[0]?.baseRev : undefined
    const write = (patch: Omit<PatchMutation['patch'], 'id' | 'ifRevisionID'>) => {
      plan.mutations.push({
        patch: { id: targetId, ...(guard ? { ifRevisionID: guard } : {}), ...patch },
      })
      guard = undefined
    }

    for (const unit of units) {
      const { set, unset, insert } = unit.patch
      for (const [path, value] of Object.entries(set ?? {})) {
        for (const parent of missingParents(snapshot, path))
          write({ setIfMissing: { [parent]: {} } })
        write({ set: { [path]: value } })
      }
      if (unset?.length) write({ unset })
      if (insert) write({ insert })
    }

    plan.writes.push({
      documentId,
      documentType: snapshot._type,
      targetId,
      created: release ? true : !hasDraft,
      ...(hasDraft && !release ? { original: snapshot } : {}),
    })
  }
  return plan
}

/**
 * The transaction that undoes a plan's writes in a scratch dataset, guarded so it can only undo what
 * the proposal itself wrote. Each document gets a no-op patch carrying `ifRevisionID` set to the
 * revision the write left it at, then the delete (a draft the proposal created) or the restore (a
 * draft that existed before). If anyone has edited the draft since, the guard fails the whole
 * transaction and nothing is touched. `unguarded` lists targets whose post-write revision is unknown:
 * they are left alone, because discarding them could destroy someone else's work.
 */
export function undoMutations(
  writes: readonly PlannedWrite[],
  revisions: Readonly<Record<string, string>>,
): { mutations: Record<string, unknown>[]; unguarded: string[] } {
  const mutations: Record<string, unknown>[] = []
  const unguarded: string[] = []
  for (const write of writes) {
    const revision = revisions[write.targetId]
    if (!revision) {
      unguarded.push(write.targetId)
      continue
    }
    mutations.push({
      patch: {
        id: write.targetId,
        ifRevisionID: revision,
        setIfMissing: { _type: write.documentType },
      },
    })
    mutations.push(
      write.original
        ? { createOrReplace: bare(write.original, write.targetId) }
        : { delete: { id: write.targetId } },
    )
  }
  return { mutations, unguarded }
}

/** The Actions API requests that undo a release plan: discard each version, then archive and delete the release. */
export function undoReleaseActions(
  writes: readonly PlannedWrite[],
  releaseId: string,
): Record<string, unknown>[] {
  return [
    ...writes.map((write) => ({
      actionType: 'sanity.action.document.version.discard',
      versionId: write.targetId,
    })),
    { actionType: 'sanity.action.release.archive', releaseId },
    { actionType: 'sanity.action.release.delete', releaseId },
  ]
}
