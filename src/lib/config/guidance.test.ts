import { describe, expect, it } from 'vitest'

import type { FeatureSetting } from '@/config/feature-config'

import { afterChange, managedBy } from './guidance'

const setting = (where: FeatureSetting['where'], extra: Partial<FeatureSetting> = {}) =>
  ({ name: 'X', kind: 'server-env', where, required: false, ...extra }) satisfies FeatureSetting

describe('guidance', () => {
  it('says what makes a change live', () => {
    expect(afterChange(setting('vercel'))).toBe('redeploy')
    expect(afterChange(setting('github'))).toBe('next-run')
    expect(afterChange(setting('local'))).toBe('restart')
    expect(afterChange(setting('sanity'))).toBe('none')
  })

  it('says who changes it, and only says Foundation when the entry does', () => {
    expect(managedBy(setting('vercel'))).toBe('provider')
    expect(managedBy(setting('local'))).toBe('local')
    expect(managedBy(setting('github', { managedBy: 'foundation' }))).toBe('foundation')
  })
})
