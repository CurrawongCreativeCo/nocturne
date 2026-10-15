import { describe, expect, it } from 'vitest'

import migration, { heroHeadingPatches } from './index'
import { headingPlainText, type HeadingBlock } from '../../src/lib/sanity/heading-text'

const hero = (extra: Record<string, unknown> = {}) => ({
  _key: 'h1',
  _type: 'hero',
  title: 'Build something great',
  ...extra,
})

const page = (...sections: unknown[]) => ({ _id: 'p', _type: 'page', pageBuilder: sections })

describe('hero-title-to-heading-text', () => {
  it('turns a title string into one plain block, keeping the old title', () => {
    const patch = heroHeadingPatches(page(hero()))[0]
    expect(patch).toMatchObject({ path: ['pageBuilder', { _key: 'h1' }, 'heading'] })
    const blocks = (patch?.op as unknown as { value: HeadingBlock[] }).value
    expect(blocks).toEqual([
      {
        _key: 'h1-heading',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          { _key: 'h1-heading-span', _type: 'span', text: 'Build something great', marks: [] },
        ],
      },
    ])
    expect(headingPlainText(blocks)).toBe('Build something great')
  })

  it('is idempotent: a hero that has a heading is skipped, and the patch is the same every run', () => {
    const done = hero({ heading: [{ _type: 'block', children: [] }] })
    expect(heroHeadingPatches(page(done))).toEqual([])
    expect(heroHeadingPatches(page(hero()))).toEqual(heroHeadingPatches(page(hero())))
  })

  it('treats an empty heading array as none, and skips blank or missing titles', () => {
    expect(heroHeadingPatches(page(hero({ heading: [] })))).toHaveLength(1)
    expect(heroHeadingPatches(page(hero({ title: '  ' })))).toEqual([])
    expect(heroHeadingPatches(page(hero({ title: undefined })))).toEqual([])
  })

  it('only touches heroes, in pages and in shared sections', () => {
    const other = { _key: 'f1', _type: 'featuresGrid', title: 'Features' }
    expect(heroHeadingPatches(page(other, hero({ _key: 'h2' })))).toHaveLength(1)
    expect(heroHeadingPatches({ _type: 'sharedSection', section: [hero()] })).toHaveLength(1)
    expect(heroHeadingPatches({ _type: 'page' })).toEqual([])
    expect(heroHeadingPatches({ _type: 'post', pageBuilder: [hero()] })).toEqual([])
  })

  it('runs through the document handler, returning nothing when there is nothing to do', () => {
    const handler = (migration.migrate as { document: (doc: unknown, context: unknown) => unknown })
      .document
    expect(handler(page(hero()), {})).toHaveLength(1)
    expect(handler(page(hero({ heading: [{ _type: 'block' }] })), {})).toBeUndefined()
  })
})
