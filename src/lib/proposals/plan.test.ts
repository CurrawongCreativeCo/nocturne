import { describe, expect, it } from 'vitest'

import documents from './fixtures/documents.json'
import { planProposal, undoMutations, type PatchMutation } from './plan'
import type { AcceptedPatch, DocumentSnapshot } from './types'

const published = documents as unknown as Record<string, DocumentSnapshot>
const HERO = 'pageBuilder[_key=="hero1"]'

const accepted = (patch: AcceptedPatch['patch'], path: string, baseRev = 'rev-home-1') =>
  ({
    documentId: 'page-home',
    baseRev,
    part: 'design',
    patch,
    path,
    needsAgencyReview: false,
    warnings: [],
  }) satisfies AcceptedPatch

const patches = (plan: ReturnType<typeof planProposal>) =>
  plan.mutations.filter((m): m is PatchMutation => 'patch' in m).map((m) => m.patch)

describe('planProposal', () => {
  it('writes only to drafts, never to the published id', () => {
    const plan = planProposal(
      [accepted({ set: { [`${HERO}.imagePosition`]: 'left' } }, `${HERO}.imagePosition`)],
      published,
    )
    const ids = plan.mutations.map((m) => ('create' in m ? m.create._id : m.patch.id))
    expect(ids.every((id) => id === 'drafts.page-home')).toBe(true)
    expect(JSON.stringify(plan)).not.toContain('publish')
  })

  it('makes the draft with create when only the published document exists, with no revision guard', () => {
    const plan = planProposal(
      [accepted({ set: { [`${HERO}.imagePosition`]: 'left' } }, `${HERO}.imagePosition`)],
      published,
    )
    expect(plan.mutations[0]).toHaveProperty('create._id', 'drafts.page-home')
    expect(plan.mutations[0]).not.toHaveProperty('create._rev')
    expect(patches(plan).every((p) => p.ifRevisionID === undefined)).toBe(true)
    expect(plan.writes).toEqual([
      {
        documentId: 'page-home',
        documentType: 'page',
        targetId: 'drafts.page-home',
        created: true,
      },
    ])
  })

  it('guards an existing draft with ifRevisionID set to baseRev, on its first patch', () => {
    const draft = {
      ...published['page-home'],
      _id: 'drafts.page-home',
      _rev: 'rev-draft-7',
    } as DocumentSnapshot
    const plan = planProposal(
      [
        accepted(
          { set: { [`${HERO}.imagePosition`]: 'left' } },
          `${HERO}.imagePosition`,
          'rev-draft-7',
        ),
        accepted({ set: { [`${HERO}.title`]: 'Hi' } }, `${HERO}.title`, 'rev-draft-7'),
      ],
      { 'page-home': draft },
    )
    expect(plan.mutations.some((m) => 'create' in m)).toBe(false)
    expect(patches(plan).map((p) => p.ifRevisionID)).toEqual(['rev-draft-7', undefined])
    expect(plan.writes[0]).toMatchObject({ created: false, original: draft })
  })

  it('creates the missing parent object before setting inside it', () => {
    const plan = planProposal(
      [accepted({ set: { [`${HERO}.partMotion.enabled`]: true } }, `${HERO}.partMotion.enabled`)],
      published,
    )
    expect(patches(plan).map((p) => Object.keys(p).filter((k) => k !== 'id'))).toEqual([
      ['setIfMissing'],
      ['set'],
    ])
    expect(patches(plan)[0]?.setIfMissing).toEqual({ [`${HERO}.partMotion`]: {} })
  })

  it('writes into a release version, with the release created first', () => {
    const plan = planProposal(
      [accepted({ set: { [`${HERO}.imagePosition`]: 'left' } }, `${HERO}.imagePosition`)],
      published,
      { release: { id: 'rTest', title: 'Test' } },
    )
    expect(plan.releaseActions.map((a) => a.actionType)).toEqual([
      'sanity.action.release.create',
      'sanity.action.document.version.create',
    ])
    expect(patches(plan).every((p) => p.id === 'versions.rTest.page-home')).toBe(true)
  })

  it('undoes with a revision guard: delete what it created, restore what existed, skip what it cannot guard', () => {
    const original = { _id: 'drafts.b', _type: 'page', _rev: 'r' }
    const writes = [
      { documentId: 'a', documentType: 'page', targetId: 'drafts.a', created: true },
      { documentId: 'b', documentType: 'page', targetId: 'drafts.b', created: false, original },
      { documentId: 'c', documentType: 'page', targetId: 'drafts.c', created: true },
    ]
    const undo = undoMutations(writes, { 'drafts.a': 'ra', 'drafts.b': 'rb' })
    expect(undo.unguarded).toEqual(['drafts.c'])
    expect(undo.mutations).toEqual([
      { patch: { id: 'drafts.a', ifRevisionID: 'ra', setIfMissing: { _type: 'page' } } },
      { delete: { id: 'drafts.a' } },
      { patch: { id: 'drafts.b', ifRevisionID: 'rb', setIfMissing: { _type: 'page' } } },
      { createOrReplace: { _id: 'drafts.b', _type: 'page' } },
    ])
  })
})
