import { describe, expect, it } from 'vitest'

import { assertTarget, DATASET } from '../tests/studio-perf/safety.ts'
import { seedDocuments } from '../tests/studio-perf/seed-data.ts'

const env = { STUDIO_PERF_PROJECT_ID: 'throwaway1', STUDIO_PERF_CONFIRM_PROJECT_ID: 'throwaway1' }

describe('Studio performance write safeguards', () => {
  it('accepts only an explicit, confirmed, non-denied local target', () => {
    expect(assertTarget(env, ['client1'])).toBe('throwaway1')
    for (const invalid of [
      {},
      { ...env, CI: 'true' },
      { ...env, STUDIO_PERF_CONFIRM_PROJECT_ID: 'other' },
      { ...env, NEXT_PUBLIC_SANITY_PROJECT_ID: 'throwaway1' },
      { ...env, STUDIO_PERF_PROJECT_ID: '../client' },
    ])
      expect(() => assertTarget(invalid, ['client1'])).toThrow()
    for (const denied of [['throwaway1'], [], null, ['bad/id']])
      expect(() => assertTarget(env, denied)).toThrow()
    expect(DATASET).toBe('studio-perf')
  })

  it('builds the requested workload with resolved references and stable section keys', () => {
    const docs = seedDocuments('image-fixture-1200x800-svg')
    const pages = docs.filter((doc) => doc._type === 'page')
    expect(pages).toHaveLength(51)
    expect(docs.filter((doc) => doc._type === 'post')).toHaveLength(20)
    expect(pages.filter((doc) => doc._id.startsWith('studio-perf-small-'))).toHaveLength(10)
    expect(pages.filter((doc) => doc._id.startsWith('studio-perf-shared-'))).toHaveLength(40)
    for (const page of pages) {
      expect(new Set(page.pageBuilder.map((section) => section._key)).size).toBe(
        page.pageBuilder.length,
      )
    }
    const large = pages.find((doc) => doc._id === 'studio-perf-large')
    expect(large.pageBuilder).toHaveLength(40)
    expect(new Set(large.pageBuilder.map((section) => section._key)).size).toBe(40)
    expect(large.pageBuilder[0]).toMatchObject({
      _type: 'hero',
      supporting: [{ _type: 'stats' }],
      partMotion: { enabled: true },
    })
    const ids = new Set(docs.map((doc) => doc._id))
    const visit = (value) => {
      if (!value || typeof value !== 'object') return
      if (value._ref && !value._ref.startsWith('image-')) expect(ids.has(value._ref)).toBe(true)
      for (const child of Object.values(value)) visit(child)
    }
    visit(docs)
  })
})
