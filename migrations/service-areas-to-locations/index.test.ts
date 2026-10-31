import { describe, expect, it } from 'vitest'

import migration, { describePlan, planServiceAreas, type Existing } from './index'

const info = (serviceAreas: unknown, _id = 'businessInfo') => ({
  _id,
  _type: 'businessInfo',
  tradingName: 'Example Plumbing',
  serviceAreas,
})
const names = (plan: { creates: { name: string }[] }) => plan.creates.map(({ name }) => name)

describe('service-areas-to-locations: planning', () => {
  it('creates one service-area location per name, with an id and page address from the name', () => {
    expect(planServiceAreas(info(['Inner West', 'Newcastle'])).creates).toEqual([
      {
        _id: 'place-area-inner-west',
        _type: 'place',
        name: 'Inner West',
        kind: 'serviceArea',
        slug: { _type: 'slug', current: 'inner-west' },
      },
      {
        _id: 'place-area-newcastle',
        _type: 'place',
        name: 'Newcastle',
        kind: 'serviceArea',
        slug: { _type: 'slug', current: 'newcastle' },
      },
    ])
  })

  it('gives identical normalised names one predictable identity and reports the repeats', () => {
    const plan = planServiceAreas(info(['  Hunter   Valley ', 'hunter valley', 'Hunter-Valley']))
    expect(names(plan)).toEqual(['Hunter Valley'])
    expect(plan.creates[0]?._id).toBe('place-area-hunter-valley')
    expect(plan.skips.map(({ reason }) => reason)).toEqual([
      expect.stringContaining('repeats an earlier name'),
      expect.stringContaining('repeats an earlier name'),
    ])
  })

  it('handles empty and invalid strings safely, reporting each', () => {
    const plan = planServiceAreas(info(['!!!', '', '   ', 42, null, { a: 1 }, 'Real Place']))
    expect(names(plan)).toEqual(['Real Place'])
    expect(plan.skips).toHaveLength(6)
    expect(plan.conflicts).toEqual([])
  })

  it('is idempotent: once the documents exist, a second run creates nothing and says why', () => {
    const first = planServiceAreas(info(['Inner West', 'Newcastle']))
    const existing: Existing = {
      places: first.creates.map(({ _id, slug }) => ({ _id, slug: slug.current })),
      pageSlugs: [],
    }
    const second = planServiceAreas(info(['Inner West', 'Newcastle']), existing)
    expect(second.creates).toEqual([])
    expect(second.skips).toHaveLength(2)
    expect(second.skips[0]?.reason).toContain('already migrated')
    // The same strings always give the same plan.
    expect(planServiceAreas(info(['Inner West', 'Newcastle']))).toEqual(first)
  })

  it('never duplicates or overwrites a place someone made by hand: a taken page address is a conflict', () => {
    const plan = planServiceAreas(info(['Inner West', 'Newcastle']), {
      places: [{ _id: 'place-manual-1', slug: 'inner-west' }],
      pageSlugs: [],
    })
    expect(names(plan)).toEqual(['Newcastle'])
    expect(plan.conflicts).toEqual([
      expect.objectContaining({ name: 'Inner West', slug: 'inner-west' }),
    ])
    expect(plan.conflicts[0]?.reason).toContain('place-manual-1')
  })

  it('reports a published page that /locations/<name> would shadow instead of creating the place', () => {
    const plan = planServiceAreas(info(['Inner West']), {
      places: [],
      pageSlugs: ['about', 'locations/inner-west'],
    })
    expect(plan.creates).toEqual([])
    expect(plan.conflicts[0]?.reason).toContain('check:location-routes')
  })

  it('links nothing: no service or team member is assigned to a new area', () => {
    const [created] = planServiceAreas(info(['Inner West'])).creates
    expect(Object.keys(created ?? {}).sort()).toEqual(['_id', '_type', 'kind', 'name', 'slug'])
  })

  it('reads only the published Business info', () => {
    for (const _id of ['drafts.businessInfo', 'versions.rSummer.businessInfo', 'other'])
      expect(planServiceAreas(info(['Inner West'], _id))).toEqual({
        creates: [],
        skips: [],
        conflicts: [],
      })
  })

  it('does nothing when there are no service areas', () => {
    for (const value of [undefined, [], 'Inner West'])
      expect(planServiceAreas(info(value)).creates).toEqual([])
  })

  it('prints the creates, skips and conflicts for the dry run', () => {
    const lines = describePlan(
      planServiceAreas(info(['Inner West', 'inner west', 'Newcastle']), {
        places: [{ _id: 'place-manual-1', slug: 'newcastle' }],
        pageSlugs: [],
      }),
    )
    expect(lines[0]).toBe('service areas -> locations: 1 to create, 1 skipped, 1 conflicts')
    expect(lines.join('\n')).toMatch(/create\s+place-area-inner-west/)
    expect(lines.join('\n')).toMatch(/skip\s+"inner west"/)
    expect(lines.join('\n')).toMatch(/CONFLICT "Newcastle"/)
  })

  it('only reads Business info, and leaves its strings alone (it returns only create operations)', () => {
    expect(migration.documentTypes).toEqual(['businessInfo'])
  })
})
