import { describe, expect, it } from 'vitest'

import { movePoint, startingEdge, type EdgeDesign } from './composed-edge-editor'
import {
  EdgeDesignError,
  applyEdgeDesign,
  checkDesignName,
  deleteEdgeDesign,
  fetchEdgeDesigns,
  renameEdgeDesign,
  saveEdgeDesign,
  listDesigns,
  type DesignClient,
} from './edge-designs'

/** A client that records the transaction it is given, and answers fetches from `answers`. */
function fakeClient(answers: { list?: unknown; published?: unknown } = {}) {
  const calls: { created: unknown[]; patches: { id: string; ops: [string, unknown][] }[] } = {
    created: [],
    patches: [],
  }
  const client: DesignClient = {
    fetch: <T>(query: string) =>
      Promise.resolve((query.includes('coalesce') ? answers.list : answers.published) as T),
    transaction() {
      const tx = {
        createIfNotExists(document: Record<string, unknown>) {
          calls.created.push(document)
          return tx
        },
        patch(id: string, build: (patch: never) => unknown) {
          const ops: [string, unknown][] = []
          const patch = {
            setIfMissing: (v: unknown) => (ops.push(['setIfMissing', v]), patch),
            insert: (...v: unknown[]) => (ops.push(['insert', v]), patch),
            unset: (v: unknown) => (ops.push(['unset', v]), patch),
            set: (v: unknown) => (ops.push(['set', v]), patch),
          }
          build(patch as never)
          calls.patches.push({ id, ops })
          return tx
        },
        commit: () => Promise.resolve(undefined),
      }
      return tx
    },
  }
  return { client, calls }
}

const design = (name: string, key = 'd1'): EdgeDesign => ({
  _key: key,
  _type: 'edgeDesign',
  name,
  edge: startingEdge(),
})

describe('reading designs', () => {
  it('lists every design with a key, so a hidden bad name can be found, renamed or deleted', () => {
    const good = design('Sunrise')
    const broken = { ...design('Old', 'd2'), edge: { ...startingEdge(), version: 2 } }
    const unnamed = design(' ', 'd3')
    const long = design('x'.repeat(80), 'd4')
    const listed = listDesigns([good, broken, null, { name: 'no key' }, unnamed, long])
    expect(listed.map((d) => [d._key, d.applicable])).toEqual([
      ['d1', true],
      ['d2', false],
      ['d3', true],
      ['d4', true],
    ])
    expect(listed.map((d) => d.label)).toEqual([
      'Sunrise',
      'Old (cannot be applied)',
      '(unnamed design)',
      `${'x'.repeat(60)}…`,
    ])
    expect(listDesigns(undefined)).toEqual([])
  })

  it('asks for the draft of Design settings first, then the published one', async () => {
    let asked = ''
    const client: DesignClient = {
      fetch: <T>(query: string) => {
        asked = query
        return Promise.resolve([design('A')] as T)
      },
      transaction: () => {
        throw new Error('not used')
      },
    }
    expect(await fetchEdgeDesigns(client)).toHaveLength(1)
    expect(asked.indexOf('drafts.designSettings')).toBeLessThan(asked.indexOf('"designSettings"'))
  })
})

describe('names', () => {
  it('trims, collapses spaces and rejects empty, long and duplicate (any case) names', () => {
    expect(checkDesignName('  Soft   dawn ', [])).toBe('Soft dawn')
    expect(() => checkDesignName('   ', [])).toThrow(/Give the design a name/)
    expect(() => checkDesignName('x'.repeat(61), [])).toThrow(/60 characters/)
    expect(() => checkDesignName('sunrise', [design('Sunrise')])).toThrow(
      /“Sunrise” already exists/,
    )
    expect(checkDesignName('Sunrise', [design('Sunrise')], 'd1')).toBe('Sunrise')
  })
})

describe('saving', () => {
  it('writes to the draft of Design settings, created from the published one, and only appends', async () => {
    const { client, calls } = fakeClient({
      published: { _id: 'designSettings', _type: 'designSettings', _rev: 'r', accent: '#111111' },
    })
    const saved = await saveEdgeDesign(client, ' Sunrise ', startingEdge())
    expect(saved.name).toBe('Sunrise')
    expect(calls.created[0]).toMatchObject({ _id: 'drafts.designSettings', accent: '#111111' })
    expect(calls.created[0]).not.toHaveProperty('_rev')
    expect(calls.patches[0]?.id).toBe('drafts.designSettings')
    expect(calls.patches[0]?.ops.map(([op]) => op)).toEqual(['setIfMissing', 'insert'])
    expect(calls.patches[0]?.ops[1]?.[1]).toEqual(['after', 'edgeDesigns[-1]', [saved]])
  })

  it('creates the draft from nothing when Design settings has never been saved', async () => {
    const { client, calls } = fakeClient({ published: null })
    await saveEdgeDesign(client, 'First', startingEdge())
    expect(calls.created[0]).toEqual({ _id: 'drafts.designSettings', _type: 'designSettings' })
  })

  it('stores a copy: the design shares no key with the section and later edits reach neither', async () => {
    const { client } = fakeClient()
    const edge = startingEdge()
    const saved = await saveEdgeDesign(client, 'Copy', edge)
    const keys = (v: typeof edge) => v.contour.points.map((p) => p._key)
    expect(keys(saved.edge).filter((k) => keys(edge).includes(k))).toEqual([])
    const moved = { ...edge, contour: movePoint(edge.contour, 1, 40, 5) }
    expect(saved.edge.contour.points[1]?.y).toBe(42)
    expect(moved.contour.points[1]?.y).toBe(5)
  })

  it('refuses an edge that would not draw without touching the document', async () => {
    const { client, calls } = fakeClient()
    await expect(
      saveEdgeDesign(client, 'Bad', { ...startingEdge(), version: 2 as never }),
    ).rejects.toThrow(/Fix the problems/)
    expect(calls.created).toEqual([])
  })

  it('checks the name against the list as stored now, so a design added elsewhere is caught', async () => {
    // The dropdown never saw "Sunrise"; another editor saved it after it loaded.
    const { client, calls } = fakeClient({ list: [design('Sunrise')] })
    await expect(saveEdgeDesign(client, 'sunrise', startingEdge())).rejects.toBeInstanceOf(
      EdgeDesignError,
    )
    expect(calls.created).toEqual([])
  })

  it('counts a stored design that no longer draws, because it still owns its name', async () => {
    const stale = { ...design('Old ridge'), edge: { ...startingEdge(), version: 2 } }
    const { client } = fakeClient({ list: [stale] })
    await expect(saveEdgeDesign(client, 'old ridge', startingEdge())).rejects.toThrow(
      /already exists/,
    )
  })
})

describe('renaming', () => {
  it('changes only the name, by key, on the draft', async () => {
    const { client, calls } = fakeClient({ list: [design('Sunrise')] })
    const name = await renameEdgeDesign(client, 'd1', '  Dawn   ridge ')
    expect(name).toBe('Dawn ridge')
    expect(calls.patches[0]?.id).toBe('drafts.designSettings')
    expect(calls.patches[0]?.ops.map(([op]) => op)).toEqual(['setIfMissing', 'set'])
    expect(calls.patches[0]?.ops[1]?.[1]).toEqual({ 'edgeDesigns[_key=="d1"].name': 'Dawn ridge' })
  })

  it('allows keeping the same name (or a new case), but not another design’s name', async () => {
    const { client } = fakeClient({ list: [design('Sunrise'), design('Dusk', 'd2')] })
    await expect(renameEdgeDesign(client, 'd1', 'SUNRISE')).resolves.toBe('SUNRISE')
    await expect(renameEdgeDesign(client, 'd1', 'dusk')).rejects.toThrow(/“Dusk” already exists/)
  })

  it('checks against the stored list, not a cached one, and says when the design is gone', async () => {
    const { client, calls } = fakeClient({ list: [design('Other', 'd9')] })
    await expect(renameEdgeDesign(client, 'd1', 'Anything')).rejects.toThrow(
      /no longer in the list/,
    )
    expect(calls.patches).toEqual([])
  })

  it('refuses empty and over-long names without writing', async () => {
    const { client, calls } = fakeClient({ list: [design('Sunrise')] })
    await expect(renameEdgeDesign(client, 'd1', '   ')).rejects.toThrow(/Give the design a name/)
    await expect(renameEdgeDesign(client, 'd1', 'x'.repeat(61))).rejects.toThrow(/60 characters/)
    expect(calls.patches).toEqual([])
  })
})

describe('applying and deleting', () => {
  it('applying copies the design with fresh keys and leaves the design as it was', () => {
    const saved = design('Sunrise')
    const before = JSON.stringify(saved)
    const applied = applyEdgeDesign(saved)
    expect(applied.contour.points.map((p) => p._key)).not.toEqual(
      saved.edge.contour.points.map((p) => p._key),
    )
    expect(JSON.stringify(saved)).toBe(before)
    const edited = { ...applied, contour: movePoint(applied.contour, 1, 20, 90) }
    expect(JSON.stringify(saved)).toBe(before)
    expect(edited.contour.points[1]?.y).toBe(90)
  })

  it('deletes one design by key on the draft', async () => {
    const { client, calls } = fakeClient()
    await deleteEdgeDesign(client, 'd1')
    expect(calls.patches[0]?.ops[1]).toEqual(['unset', ['edgeDesigns[_key=="d1"]']])
  })
})

describe('recovering a hidden design whose name breaks its rules', () => {
  it('renames an unnamed design by key, and deletes an over-long one', async () => {
    const { client, calls } = fakeClient({
      list: [design('', 'bad1'), design('y'.repeat(70), 'bad2')],
    })
    await expect(renameEdgeDesign(client, 'bad1', 'Fixed')).resolves.toBe('Fixed')
    await deleteEdgeDesign(client, 'bad2')
    expect(calls.patches.map((p) => p.ops[1]?.[0])).toEqual(['set', 'unset'])
  })
})
