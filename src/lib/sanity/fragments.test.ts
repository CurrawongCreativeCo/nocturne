import { describe, expect, it } from 'vitest'

import { sectionStyleFields } from './fragments'
import { sectionStyle } from './schema/section-style'

describe('sectionStyleFields', () => {
  it('projects every bottom-edge field the Studio has, so none is lost on its way to the page', () => {
    // Task 151: Tide's crest colour and Contour's line colour were once in the schema and not the query,
    // so the page drew the defaults whatever was chosen.
    const projected = new Set(sectionStyleFields.match(/\b[a-zA-Z]+\b/g))
    const edgeFields = (sectionStyle.fields as unknown as { name: string }[])
      .map((field) => field.name)
      .filter((name) => name.startsWith('edge'))
    expect(edgeFields.length).toBeGreaterThan(5)
    expect(edgeFields.filter((name) => !projected.has(name))).toEqual([])
  })
})
