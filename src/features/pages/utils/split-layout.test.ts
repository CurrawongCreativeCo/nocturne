import { describe, expect, it } from 'vitest'

import { chooseMedia, drawnSplitLayout, splitLayout, videoHasSource } from './split-layout'

describe('splitLayout', () => {
  it('is side by side when unset, as before layouts existed', () => {
    expect(splitLayout(undefined)).toBe('side')
    expect(splitLayout(null)).toBe('side')
  })

  it('ignores a layout this deployment does not know', () => {
    expect(splitLayout('carousel')).toBe('side')
  })

  it.each(['side', 'stacked', 'overlay'])('keeps %s', (layout) => {
    expect(splitLayout(layout)).toBe(layout)
  })
})

describe('drawnSplitLayout', () => {
  it('puts text over a picture', () => {
    expect(drawnSplitLayout('overlay', 'image')).toBe('overlay')
  })

  it('falls back to side by side when there is a video or nothing to put the text on', () => {
    expect(drawnSplitLayout('overlay', 'video')).toBe('side')
    expect(drawnSplitLayout('overlay', null)).toBe('side')
  })

  it('leaves the other layouts alone', () => {
    expect(drawnSplitLayout('stacked', 'video')).toBe('stacked')
    expect(drawnSplitLayout('side', null)).toBe('side')
  })
})

describe('chooseMedia', () => {
  it('draws the legacy image when there is no media block', () => {
    expect(chooseMedia(undefined, true)).toBe('legacy-image')
    expect(chooseMedia(null, false)).toBeNull()
  })

  it('prefers a valid media block and never draws both', () => {
    expect(chooseMedia({ type: 'slotImage', hasPicture: true }, true)).toBe('block-image')
    expect(chooseMedia({ type: 'slotVideo', hasVideoSource: true }, true)).toBe('block-video')
  })

  it('keeps the legacy image when the block is empty, half-filled or unknown', () => {
    expect(chooseMedia({ type: 'slotImage', hasPicture: false }, true)).toBe('legacy-image')
    expect(chooseMedia({ type: 'slotVideo', hasVideoSource: false }, true)).toBe('legacy-image')
    expect(chooseMedia({ type: 'slotCarousel' }, true)).toBe('legacy-image')
  })

  it('shows nothing for an invalid block and no legacy image', () => {
    expect(chooseMedia({ type: 'slotImage', hasPicture: false }, false)).toBeNull()
  })
})

describe('videoHasSource', () => {
  it('needs an address for YouTube and Vimeo, and a file for an upload', () => {
    expect(videoHasSource({ source: 'youtube', url: 'https://youtu.be/x' })).toBe(true)
    expect(videoHasSource({ url: 'https://youtu.be/x' })).toBe(true)
    expect(videoHasSource({ source: 'vimeo' })).toBe(false)
    expect(videoHasSource({ source: 'upload', url: 'https://youtu.be/x' })).toBe(false)
    expect(videoHasSource({ source: 'upload', fileUrl: 'https://cdn/x.mp4' })).toBe(true)
  })
})
