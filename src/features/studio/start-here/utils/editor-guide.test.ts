import { describe, expect, it } from 'vitest'

import { editorGuide, videoFor } from './editor-guide'

describe('videoFor', () => {
  it('finds a video by guide id', () => {
    const videos = { 'change-a-heading': 'https://example.com/v' }
    expect(videoFor('change-a-heading', videos)).toBe('https://example.com/v')
    expect(videoFor('replace-a-photo', videos)).toBeUndefined()
    expect(videoFor('replace-a-photo', undefined)).toBeUndefined()
  })
})

describe('the generated guide', () => {
  it('has the guides every site gets and only well-formed entries', () => {
    const ids = editorGuide.guides.map((guide) => guide.id)
    expect(ids).toEqual(
      expect.arrayContaining(['change-a-heading', 'replace-a-photo', 'publish-and-undo']),
    )
    for (const guide of editorGuide.guides) {
      expect(guide.title).not.toBe('')
      expect(guide.body).not.toBe('')
      expect(guide.body).not.toContain('<!--')
    }
  })
})
