import { describe, expect, it } from 'vitest'

import { validateSiteProfile } from '@/config/profile'

import { sectionTypes } from './index'
import { siteProfileInput } from '../../../../../site.profile'

describe('site.profile.ts', () => {
  it('is valid, and its clientSections are real section types', () => {
    expect(
      validateSiteProfile(siteProfileInput, { sectionNames: sectionTypes.map((s) => s.name) }),
    ).toEqual([])
  })
})
