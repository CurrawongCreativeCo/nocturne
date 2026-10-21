import { describe, expect, it } from 'vitest'

import { hiddenFrameReferencePatches } from './hidden-frame-reference'

describe('hidden frame reference publishing', () => {
  it('keeps a hidden inline-created reference weak when Sanity strengthens references on publish', () => {
    const patches = hiddenFrameReferencePatches(
      {
        appearance: 'circle',
        frame: 'custom',
        customFrame: { _ref: 'draft-frame', _weak: true, _strengthenOnPublish: { type: 'frame' } },
      },
      false,
    )
    expect(patches).toEqual([
      expect.objectContaining({
        type: 'set',
        path: ['customFrame', '_strengthenOnPublish'],
        value: { type: 'frame', weak: true },
      }),
    ])
  })

  it('restores strengthening when the saved frame is used again', () => {
    const patches = hiddenFrameReferencePatches(
      {
        appearance: 'framed',
        frame: 'custom',
        customFrame: {
          _ref: 'frame',
          _weak: true,
          _strengthenOnPublish: { type: 'frame', weak: true },
        },
      },
      false,
    )
    expect(patches).toEqual([expect.objectContaining({ value: { type: 'frame', weak: false } })])
  })

  it('also protects a Link list profile after switching away from its frame border', () => {
    const patches = hiddenFrameReferencePatches({ border: 'line', frame: { _ref: 'frame' } }, true)
    expect(patches).toEqual([
      expect.objectContaining({ path: ['frame', '_weak'], value: true }),
      expect.objectContaining({
        path: ['frame', '_strengthenOnPublish'],
        value: { type: 'frame', weak: true },
      }),
    ])
  })
})
