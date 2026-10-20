import { describe, expect, it } from 'vitest'

import { definedOnly, layerDesign } from './design-overrides'

interface Look {
  border?: string
  width?: number
  shown?: boolean
  background?: string
}

describe('layerDesign', () => {
  it('lets the most specific defined value win, one property at a time', () => {
    const list: Look = { border: 'thin', background: 'teal' }
    const card: Look = { border: 'thick' }
    expect(layerDesign<Look>(list, card)).toEqual({ border: 'thick', background: 'teal' })
  })

  it('treats only undefined as inherit: none, 0, false and transparent are real choices', () => {
    const list: Look = { border: 'thin', width: 2, shown: true, background: 'teal' }
    const card: Look = { border: 'none', width: 0, shown: false, background: 'transparent' }
    expect(layerDesign<Look>(list, card)).toEqual(card)
  })

  it('keeps the list’s value where the card leaves a property undefined', () => {
    expect(layerDesign<Look>({ width: 0 }, { width: undefined })).toEqual({ width: 0 })
    expect(layerDesign<Look>({ border: 'none' }, null, undefined)).toEqual({ border: 'none' })
  })

  it('never mutates a layer', () => {
    const list: Look = { border: 'thin' }
    layerDesign<Look>(list, { border: 'thick' })
    expect(list).toEqual({ border: 'thin' })
    expect(definedOnly<Look>({ border: undefined })).toEqual({})
  })
})
