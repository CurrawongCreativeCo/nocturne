import { describe, expect, it } from 'vitest'

import migration, { SECTION_TYPES, sectionHeadingPatches } from './index'
import { headingPlainText, type HeadingBlock } from '../../src/lib/sanity/heading-text'

const hero = (extra: Record<string, unknown> = {}) => ({
  _key: 'h1',
  _type: 'ctaBanner',
  title: 'Build something great',
  ...extra,
})

const page = (...sections: unknown[]) => ({ _id: 'p', _type: 'page', pageBuilder: sections })

describe('section-titles-to-heading-text', () => {
  it('turns a title string into one plain block, keeping the old title', () => {
    const patch = sectionHeadingPatches(page(hero()))[0]
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

  it('is idempotent: a section that has a heading is skipped, and the patch is the same every run', () => {
    const done = hero({ heading: [{ _type: 'block', children: [] }] })
    expect(sectionHeadingPatches(page(done))).toEqual([])
    expect(sectionHeadingPatches(page(hero()))).toEqual(sectionHeadingPatches(page(hero())))
  })

  it('treats an empty heading array as none, and skips blank or missing titles', () => {
    expect(sectionHeadingPatches(page(hero({ heading: [] })))).toHaveLength(1)
    expect(sectionHeadingPatches(page(hero({ title: '  ' })))).toEqual([])
    expect(sectionHeadingPatches(page(hero({ title: undefined })))).toEqual([])
  })

  it('covers every section with a title, but not the hero (its own migration) or item titles', () => {
    expect(SECTION_TYPES).toHaveLength(18)
    expect(SECTION_TYPES).not.toContain('hero')
    const sections = SECTION_TYPES.map((_type, i) => ({ _key: `s${i}`, _type, title: 'T' }))
    expect(sectionHeadingPatches(page(...sections))).toHaveLength(18)
    const features = {
      _key: 'f',
      _type: 'featuresGrid',
      title: 'Features',
      items: [{ title: 'x' }],
    }
    const paths = sectionHeadingPatches(page(features)).map((patch) => patch.path)
    expect(paths).toEqual([['pageBuilder', { _key: 'f' }, 'heading']])
    expect(sectionHeadingPatches(page({ _key: 'h', _type: 'hero', title: 'Hi' }))).toEqual([])
  })

  it('only touches sections in pages and in shared sections', () => {
    const other = { _key: 'x1', _type: 'richText', title: 'Not a titled section' }
    expect(sectionHeadingPatches(page(other, hero({ _key: 'h2' })))).toHaveLength(1)
    expect(sectionHeadingPatches({ _type: 'sharedSection', section: [hero()] })).toHaveLength(1)
    expect(sectionHeadingPatches({ _type: 'page' })).toEqual([])
    expect(sectionHeadingPatches({ _type: 'post', pageBuilder: [hero()] })).toEqual([])
  })

  it('runs through the document handler, returning nothing when there is nothing to do', () => {
    const handler = (migration.migrate as { document: (doc: unknown, context: unknown) => unknown })
      .document
    expect(handler(page(hero()), {})).toHaveLength(1)
    expect(handler(page(hero({ heading: [{ _type: 'block' }] })), {})).toBeUndefined()
  })
})
