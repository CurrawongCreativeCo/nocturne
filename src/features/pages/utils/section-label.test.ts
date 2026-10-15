import { describe, expect, it } from 'vitest'

import { sectionLabel } from './section-label'
import type { PageSection } from '../types'

const section = (fields: object) => fields as PageSection

describe('sectionLabel', () => {
  it('is the type for a section without variants', () => {
    expect(sectionLabel(section({ _key: 'a', _type: 'faq' }))).toBe('faq')
  })

  it('adds the banner tone', () => {
    expect(sectionLabel(section({ _key: 'a', _type: 'ctaBanner', tone: 'dark' }))).toBe(
      'ctaBanner (dark tone)',
    )
  })

  it('adds the number of grid columns', () => {
    expect(sectionLabel(section({ _key: 'a', _type: 'featuresGrid', columns: 4 }))).toBe(
      'featuresGrid (4 columns)',
    )
  })

  it('tells the image side from a missing image', () => {
    const image = { asset: { _id: 'image-1' } }
    expect(
      sectionLabel(section({ _key: 'a', _type: 'mediaText', imagePosition: 'left', image })),
    ).toBe('mediaText (image left)')
    expect(
      sectionLabel(section({ _key: 'a', _type: 'mediaText', imagePosition: 'left', image: null })),
    ).toBe('mediaText (no image)')
  })

  it('adds the Design options an editor set, joined to the other variants', () => {
    expect(
      sectionLabel(
        section({ _key: 'a', _type: 'faq', style: { tone: 'inverse', spacing: 'compact' } }),
      ),
    ).toBe('faq (inverse section, compact spacing)')
    expect(
      sectionLabel(
        section({
          _key: 'a',
          _type: 'featuresGrid',
          columns: 3,
          style: { tone: 'alt', spacing: 'default', width: 'narrow', align: null },
        }),
      ),
    ).toBe('featuresGrid (3 columns, alt section, narrow width)')
    expect(sectionLabel(section({ _key: 'a', _type: 'faq', style: null }))).toBe('faq')
  })

  it('is just the type for a stub with no fields', () => {
    expect(sectionLabel(section({ _key: 'a', _type: 'ctaBanner', access: 'members' }))).toBe(
      'ctaBanner',
    )
  })

  it('adds a bottom edge, but not a straight one', () => {
    const edge = (value: string) =>
      section({ _key: 'a', _type: 'richText', style: { edge: value } })
    expect(sectionLabel(edge('wave'))).toBe('richText (wave edge)')
    expect(sectionLabel(edge('none'))).toBe('richText')
  })
})
