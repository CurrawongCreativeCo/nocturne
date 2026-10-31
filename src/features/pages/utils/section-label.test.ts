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

  it('names the media slot, the layouts and a supporting block', () => {
    const slotImage = { _type: 'slotImage', image: { asset: { _id: 'image-1' } } }
    const media = (extra: object) =>
      sectionLabel(
        section({ _key: 'a', _type: 'mediaText', imagePosition: 'left', image: null, ...extra }),
      )
    expect(media({ media: [slotImage] })).toBe('mediaText (media left)')
    expect(media({ media: [slotImage], variant: 'stacked' })).toBe('mediaText (stacked)')
    expect(media({ media: [slotImage], variant: 'overlay' })).toBe('mediaText (overlay)')
    expect(media({ media: [slotImage], supporting: [{ _type: 'slotVideo' }] })).toBe(
      'mediaText (media left, supporting video)',
    )
    expect(media({ media: [{ _type: 'slotVideo' }], variant: 'stacked' })).toBe(
      'mediaText (stacked, video media)',
    )
    expect(media({ media: [] })).toBe('mediaText (no image)')
  })

  it('adds the picture design an editor chose, so the gallery tells the pictures apart', () => {
    const image = { asset: { _id: 'image-1' } }
    const media = (imageDesign: object) =>
      sectionLabel(
        section({ _key: 'a', _type: 'mediaText', imagePosition: 'right', image, imageDesign }),
      )
    expect(media({ appearance: 'circle' })).toBe('mediaText (image right, circle picture)')
    expect(media({ appearance: 'framed', frame: 'double-line', motion: 'medium' })).toBe(
      'mediaText (image right, framed picture, double-line frame, medium picture motion)',
    )
    // The defaults add nothing.
    expect(media({ appearance: 'standard', motion: 'none' })).toBe('mediaText (image right)')
    // A frame is named only for the Framed appearance.
    expect(media({ appearance: 'arch', frame: 'thin-line' })).toBe(
      'mediaText (image right, arch picture)',
    )
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
