import { describe, expect, it } from 'vitest'

import migration from './index'

function run(doc: Record<string, unknown>) {
  const handler: unknown = (migration.migrate as { document?: unknown } | undefined)?.document
  if (typeof handler !== 'function') throw new Error('migration has no document handler')
  // The handler only reads fields from the document, so the migration context is not needed.
  return (handler as (doc: unknown, context: unknown) => unknown)(
    { _id: 'a', _type: 'page', ...doc },
    {},
  )
}

describe('example-rename-page-summary', () => {
  it('moves the old field to the new name', () => {
    expect(run({ summary: 'Hello' })).toEqual([
      { path: ['description'], op: { type: 'set', value: 'Hello' } },
      { path: ['summary'], op: { type: 'unset' } },
    ])
  })

  it('skips documents without the old field or that already have the new one', () => {
    expect(run({ title: 'x' })).toBeUndefined()
    expect(run({ summary: 'old', description: 'new' })).toBeUndefined()
  })
})
