import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { edgeTones } from './composed-edge-tones'

const doc = {
  pageBuilder: [
    { _key: 'a', style: { tone: 'inverse' } },
    { _key: 'b', style: { tone: 'alt' } },
    { _key: 'c', style: {} },
  ],
}
const pathOf = (key: string) => ['pageBuilder', { _key: key }, 'style', 'composedEdge']

describe('edgeTones', () => {
  it("reads this section's tone and the next section's tone", () => {
    expect(edgeTones(doc, pathOf('a'))).toEqual({
      upper: colorHex.surfaceInverse,
      lower: colorHex.surfaceAlt,
      upperDark: true,
    })
  })

  it('treats an unset tone as the page colour, and the last section as sitting on the page colour', () => {
    expect(edgeTones(doc, pathOf('b'))).toMatchObject({
      upper: colorHex.surfaceAlt,
      lower: colorHex.surface,
      upperDark: false,
    })
    expect(edgeTones(doc, pathOf('c'))).toMatchObject({
      upper: colorHex.surface,
      lower: colorHex.surface,
    })
  })

  it('gives nothing when the document or section cannot be found, so the preview keeps its defaults', () => {
    expect(edgeTones(undefined, pathOf('a'))).toBeUndefined()
    expect(edgeTones(doc, pathOf('zzz'))).toBeUndefined()
    expect(edgeTones(doc, undefined)).toBeUndefined()
  })
})
