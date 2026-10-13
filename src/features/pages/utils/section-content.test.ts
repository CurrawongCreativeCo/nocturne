import { describe, expect, it } from 'vitest'

import { hasContent } from './section-content'
import type { PageSection } from '../types'

const section = (fields: object) => fields as PageSection

describe('hasContent', () => {
  it('is false for the stub of a members-only section', () => {
    expect(hasContent(section({ _key: 'a', _type: 'richText', access: 'members' }))).toBe(false)
  })

  it('is false for a stub that came from a shared section', () => {
    expect(
      hasContent(section({ _key: 'a', _type: 'hero', access: 'members', sharedSectionId: 'x' })),
    ).toBe(false)
  })

  it('is true once the section has any other field, even an empty one', () => {
    expect(hasContent(section({ _key: 'a', _type: 'hero', access: 'members', title: 'T' }))).toBe(
      true,
    )
    expect(hasContent(section({ _key: 'a', _type: 'richText', access: null, body: null }))).toBe(
      true,
    )
  })
})
