import { describe, expect, it } from 'vitest'

import { EMPTY_TYPE_LIST_TEXT, emptyListResources } from './empty-list-wording'

describe('empty list wording', () => {
  it('replaces only the whole-type empty line', () => {
    expect(Object.keys(emptyListResources)).toEqual([
      'panes.document-list-pane.no-documents-of-type.text',
    ])
  })

  it('is true in every list: no jargon, no action, no type name', () => {
    expect(EMPTY_TYPE_LIST_TEXT).not.toMatch(/document|create|add|new|click/i)
  })
})
