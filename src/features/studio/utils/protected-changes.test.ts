import { describe, expect, it } from 'vitest'

import {
  changeKey,
  describeChange,
  diffProtectedFields,
  humaniseFieldName,
} from './protected-changes'

const paths = (type: string, published: unknown, draft: unknown) =>
  diffProtectedFields(type, published, draft).map(changeKey).sort()

const hero = (extra: Record<string, unknown> = {}) => ({
  _type: 'hero',
  _key: 'h1',
  heading: 'Welcome',
  ...extra,
})
const page = (sections: unknown[], extra: Record<string, unknown> = {}) => ({
  _id: 'drafts.p',
  _type: 'page',
  title: 'Home',
  pageBuilder: sections,
  ...extra,
})

describe('diffProtectedFields', () => {
  it('reports nothing when only editable fields changed', () => {
    const published = page([hero()])
    const draft = page([hero({ heading: 'Hello' })], { title: 'Start' })
    expect(paths('page', published, draft)).toEqual([])
  })

  it('ignores bookkeeping fields', () => {
    const draft = { ...page([hero()]), _rev: 'b', _updatedAt: '2026-10-26T00:00:00Z' }
    expect(paths('page', { ...page([hero()]), _rev: 'a' }, draft)).toEqual([])
  })

  it('reports a protected field on the document', () => {
    expect(paths('page', page([]), page([], { access: 'members' }))).toEqual(['access'])
  })

  it('reports a protected field inside a section, named by the section type', () => {
    const published = page([hero()])
    const draft = page([hero({ imageShape: 'circle' })])
    expect(paths('page', published, draft)).toEqual(['pageBuilder.hero.imageShape'])
  })

  it('reports an unclassified field, so a new field fails safe', () => {
    expect(paths('page', page([]), page([], { brandNewField: 1 }))).toEqual(['brandNewField'])
  })

  it('reports a changed style object once, at the field', () => {
    const published = page([hero({ style: { _type: 'sectionStyle', tone: 'dark' } })])
    const draft = page([hero({ style: { _type: 'sectionStyle', tone: 'light' } })])
    expect(paths('page', published, draft)).toEqual(['pageBuilder.hero.style'])
  })

  it('reports a new section that carries protected values', () => {
    const draft = page([hero(), hero({ _key: 'h2', access: 'members' })])
    expect(paths('page', page([hero()]), draft)).toEqual(['pageBuilder.hero.access'])
  })

  it('does not report a new section with only content', () => {
    expect(paths('page', page([hero()]), page([hero(), hero({ _key: 'h2' })]))).toEqual([])
  })

  it('does not report a removed section or a reorder', () => {
    const a = hero({ imageShape: 'circle' })
    const b = { _type: 'richText', _key: 'r1', body: [] }
    expect(paths('page', page([a, b]), page([b]))).toEqual([])
    expect(paths('page', page([a, b]), page([b, a]))).toEqual([])
  })

  it('treats unset, null and empty as the same', () => {
    const published = page([hero({ imageShape: null })])
    const draft = page([hero({ partMotion: [] })])
    expect(paths('page', published, draft)).toEqual([])
  })

  it('reports every protected field when nothing is published yet', () => {
    expect(
      paths('page', null, page([hero({ imageShape: 'circle' })], { access: 'members' })),
    ).toEqual(['access', 'pageBuilder.hero.imageShape'])
  })

  it('reports each protected change in a draft', () => {
    const published = page([hero()])
    const draft = page([hero({ imageShape: 'circle' })], { minimalLayout: true })
    expect(paths('page', published, draft)).toEqual([
      'minimalLayout',
      'pageBuilder.hero.imageShape',
    ])
  })

  it('finds protected fields on a typed object inside an editable object', () => {
    const published = { _type: 'page', seo: { _type: 'seo', metaTitle: 'A' } }
    const draft = { _type: 'page', seo: { _type: 'seo', metaTitle: 'B', noIndex: true } }
    expect(paths('page', published, draft)).toEqual(['seo.noIndex'])
  })

  it('treats every field on an agency-only type as protected', () => {
    expect(paths('redirect', { source: '/a' }, { source: '/b' })).toEqual(['source'])
  })

  it('reports whole agency-only documents without recursing', () => {
    const published = page([{ _type: 'sharedSection', _key: 's', title: 'a' }])
    const draft = page([{ _type: 'sharedSection', _key: 's', title: 'b' }])
    expect(paths('page', published, draft)).toEqual(['pageBuilder.sharedSection'])
  })

  it('returns nothing for a missing draft', () => {
    expect(diffProtectedFields('page', page([]), undefined)).toEqual([])
  })
})

describe('describeChange', () => {
  it('reads as a path of plain words', () => {
    expect(describeChange({ path: ['pageBuilder', 'hero', 'imageShape'] })).toBe(
      'Page builder › Hero › Image shape',
    )
  })

  it('humanises camelCase', () => {
    expect(humaniseFieldName('minimalLayout')).toBe('Minimal layout')
  })
})
