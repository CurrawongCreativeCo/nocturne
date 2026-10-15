import { defineField } from 'sanity'
import { describe, expect, it } from 'vitest'

import { sectionFields, sectionFieldsets, sectionGroups, sectionStyle } from './section-style'

const names = (fields: readonly { name: string }[]) => fields.map(({ name }) => name)

interface LooseField {
  name: string
  group?: string
  fieldset?: string
  hidden?: unknown
  options?: { presetPicker?: boolean; list: { thumbnail?: unknown }[] }
}
const styleFields = sectionStyle.fields as unknown as LooseField[]

describe('sectionFields', () => {
  const fields = sectionFields([
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'variant', type: 'string' }),
  ])

  it('puts the layout picker first, then content, then the Design style', () => {
    expect(names(fields)).toEqual(['variant', 'title', 'style'])
    expect(fields.find((f) => f.name === 'title')?.group).toBe('content')
    expect(fields.find((f) => f.name === 'style')?.group).toBe('design')
  })

  it('hides the style from clients', () => {
    expect(fields.find((f) => f.name === 'style')?.hidden).toBeTypeOf('function')
  })

  it('leaves out the Advanced fields when a section has none', () => {
    expect(fields.some((f) => f.fieldset === 'advanced')).toBe(false)
  })

  it('puts a section’s advanced fields in the Advanced fieldset, agency only', () => {
    const withAdvanced = sectionFields(
      [],
      {},
      {
        advanced: [defineField({ name: 'edge', type: 'string', hidden: () => true })],
      },
    )
    const edge = withAdvanced.find((f) => f.name === 'edge')
    expect(edge).toMatchObject({ group: 'design', fieldset: 'advanced' })
    // Its own hidden still applies, on top of the client rule.
    expect((edge?.hidden as (c: never) => boolean)({ currentUser: null } as never)).toBe(true)
  })
})

describe('section groups and fieldsets', () => {
  it('hide the Design tab from clients', () => {
    expect(sectionGroups.find((g) => g.name === 'design')?.hidden).toBeTypeOf('function')
    expect(sectionGroups.find((g) => g.name === 'content')?.hidden).toBeUndefined()
  })

  it('offer a collapsed Advanced fieldset in the Design tab', () => {
    expect(sectionFieldsets).toEqual([
      expect.objectContaining({ name: 'advanced', group: 'design' }),
    ])
  })
})

describe('sectionStyle', () => {
  it('keeps the stored field names, so no content needs migrating', () => {
    expect(names(styleFields)).toEqual(['tone', 'motion', 'spacing', 'width', 'align', 'anchorId'])
  })

  it('shows Background and Animation first and tucks the rest into one collapsed fieldset', () => {
    const byName = Object.fromEntries(styleFields.map((f) => [f.name, f])) as Record<
      string,
      LooseField
    >
    expect(byName.tone?.fieldset).toBeUndefined()
    expect(byName.motion?.fieldset).toBeUndefined()
    for (const name of ['spacing', 'width', 'align', 'anchorId']) {
      expect(byName[name]?.fieldset).toBe('layoutOptions')
    }
    expect(sectionStyle.fieldsets).toEqual([
      expect.objectContaining({
        name: 'layoutOptions',
        title: 'More layout options',
        options: { collapsible: true, collapsed: true },
      }),
    ])
  })

  it('has no box of its own', () => {
    expect(sectionStyle.options).toMatchObject({ frameless: true })
  })

  it('shows Background and Animation as pictures', () => {
    const picker = (name: string) => styleFields.find((f) => f.name === name)?.options
    for (const name of ['tone', 'motion']) {
      expect(picker(name)?.presetPicker).toBe(true)
      expect(picker(name)?.list.every((option) => option.thumbnail)).toBe(true)
    }
  })
})
