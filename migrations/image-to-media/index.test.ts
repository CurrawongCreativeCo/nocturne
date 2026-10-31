import { describe, expect, it } from 'vitest'

import migration, { imageToMediaPatches } from './index'

const image = {
  _type: 'image',
  alt: 'A workshop',
  asset: { _type: 'reference', _ref: 'image-abc-1600x1200-jpg' },
  hotspot: { x: 0.4, y: 0.6, width: 0.5, height: 0.5 },
  crop: { top: 0, bottom: 0.1, left: 0, right: 0 },
}

const section = (extra: Record<string, unknown> = {}) => ({
  _key: 'm1',
  _type: 'mediaText',
  title: 'Our story',
  image,
  imagePosition: 'left',
  ...extra,
})

const page = (...sections: unknown[]) => ({ _id: 'p', _type: 'page', pageBuilder: sections })

describe('image-to-media', () => {
  it('puts the picture into a slotImage block, copied whole', () => {
    const [patch] = imageToMediaPatches(page(section()))
    expect(patch).toMatchObject({ path: ['pageBuilder', { _key: 'm1' }, 'media'] })
    expect((patch?.op as unknown as { value: unknown[] }).value).toEqual([
      { _key: 'm1-media', _type: 'slotImage', image },
    ])
  })

  it('never removes or changes anything: it only adds media', () => {
    const patches = imageToMediaPatches(page(section()))
    expect(patches).toHaveLength(1)
    expect(patches.every((patch) => patch.path.at(-1) === 'media')).toBe(true)
  })

  it('is idempotent: a section that has media is skipped, and the patch is the same every run', () => {
    const done = section({ media: [{ _key: 'x', _type: 'slotVideo' }] })
    expect(imageToMediaPatches(page(done))).toEqual([])
    expect(imageToMediaPatches(page(section()))).toEqual(imageToMediaPatches(page(section())))
  })

  it('treats an empty media array as none, and skips a section with no picture', () => {
    expect(imageToMediaPatches(page(section({ media: [] })))).toHaveLength(1)
    expect(imageToMediaPatches(page(section({ image: undefined })))).toEqual([])
    expect(imageToMediaPatches(page(section({ image: { _type: 'image', alt: 'x' } })))).toEqual([])
  })

  it('only touches Image + text, in pages and in shared sections', () => {
    const other = { _key: 'f1', _type: 'featuresGrid', image }
    expect(imageToMediaPatches(page(other, section({ _key: 'm2' })))).toHaveLength(1)
    expect(imageToMediaPatches({ _type: 'sharedSection', section: [section()] })).toHaveLength(1)
    expect(imageToMediaPatches({ _type: 'page' })).toEqual([])
    expect(imageToMediaPatches({ _type: 'post', pageBuilder: [section()] })).toEqual([])
  })

  it('selects only the documents that hold sections, and returns nothing to change otherwise', () => {
    expect(migration.documentTypes).toEqual(['page', 'sharedSection'])
  })
})

/** Applies the migration's `set` patches to a copy, the way a real run would. */
function apply(doc: Record<string, unknown>) {
  const copy = structuredClone(doc)
  for (const patch of imageToMediaPatches(copy)) {
    const [field, selector, name] = patch.path as [string, { _key: string }, string]
    const sections = copy[field] as Record<string, unknown>[]
    const target = sections.find((section) => section._key === selector._key)
    if (target) target[name] = (patch.op as unknown as { value: unknown }).value
  }
  return copy
}

describe('image-to-media dry run on the end-to-end fixture dataset', () => {
  it('loses nothing: every document is the same after, except for the added media', async () => {
    const { documents } = (await import('../../tests/e2e/fixtures/dataset.mjs')) as {
      documents: Record<string, unknown>[]
    }
    const holders = documents.filter((doc) => doc._type === 'page' || doc._type === 'sharedSection')
    let changed = 0
    for (const doc of holders) {
      const after = apply(doc)
      const field = doc._type === 'page' ? 'pageBuilder' : 'section'
      const before = (doc[field] ?? []) as Record<string, unknown>[]
      const sections = (after[field] ?? []) as Record<string, unknown>[]
      sections.forEach((section, index) => {
        const original = before[index] ?? {}
        const { media, ...rest } = section
        const { media: originalMedia, ...originalRest } = original
        // Everything but `media` is byte-for-byte the same, including the legacy image.
        expect(rest).toEqual(originalRest)
        if (JSON.stringify(media) !== JSON.stringify(originalMedia)) {
          // Only a section with no media of its own may gain one.
          expect(originalMedia ?? []).toEqual([])
          changed += 1
          expect(original._type).toBe('mediaText')
          expect(media).toEqual([
            { _key: `${String(original._key)}-media`, _type: 'slotImage', image: original.image },
          ])
        }
      })
    }
    // The fixtures have pictures to move, so a no-op would be a broken test.
    expect(changed).toBeGreaterThan(0)
  })

  it('is a no-op when run again on its own result', async () => {
    const { documents } = (await import('../../tests/e2e/fixtures/dataset.mjs')) as {
      documents: Record<string, unknown>[]
    }
    for (const doc of documents) expect(imageToMediaPatches(apply(doc))).toEqual([])
  })
})
