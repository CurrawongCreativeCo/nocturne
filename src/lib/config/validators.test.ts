import { describe, expect, it } from 'vitest'

import { suggestFormat, validateFormat } from './validators'

describe('validateFormat', () => {
  it('accepts a bare address and a named one', () => {
    expect(validateFormat('email-with-name', 'forms@example.com.au')).toBeNull()
    expect(validateFormat('email-with-name', 'Site name <forms@example.com.au>')).toBeNull()
    expect(validateFormat('email-with-name', 'not an address')).toMatch(/expects/)
    expect(validateFormat('email-with-name', 'Name <nope>')).toMatch(/expects/)
  })

  it('accepts the sender forms Resend documents, and refuses what it would bounce', () => {
    const valid = (value: string) => validateFormat('email-with-name', value)
    expect(valid('"Site, Inc" <forms@example.com.au>')).toBeNull()
    expect(valid('  Site name <forms@mail.example.com.au>  ')).toBeNull()
    expect(valid('<forms@example.com.au>')).toBeNull()
    for (const bad of [
      '',
      'forms@',
      '@example.com',
      'forms@example',
      'a@b@c.com',
      'Name <a@b.com> extra',
      'Name <a@b.com',
      'two words@example.com',
    ]) {
      expect(valid(bad), bad).toMatch(/expects/)
    }
  })

  it('suggests a correction for every format', () => {
    for (const format of [
      'sanity-project-id',
      'sanity-dataset',
      'https-url',
      'email-with-name',
      'off-switch',
    ] as const) {
      expect(suggestFormat(format).length).toBeGreaterThan(10)
    }
  })

  it('knows Sanity project IDs, datasets and the off switch', () => {
    expect(validateFormat('sanity-project-id', 'ci-placeholder')).toBeNull()
    expect(validateFormat('sanity-project-id', 'Has Spaces')).toMatch(/expects/)
    expect(validateFormat('sanity-dataset', 'production')).toBeNull()
    expect(validateFormat('sanity-dataset', 'Production')).toMatch(/expects/)
    expect(validateFormat('off-switch', 'off')).toBeNull()
    expect(validateFormat('off-switch', 'on')).toMatch(/expects/)
  })

  it('wants https for an address', () => {
    expect(validateFormat('https-url', 'https://example.com.au')).toBeNull()
    expect(validateFormat('https-url', 'http://example.com.au')).toMatch(/expects/)
    expect(validateFormat('https-url', 'example.com.au')).toMatch(/expects/)
  })

  it('never repeats the value it rejects', () => {
    expect(validateFormat('https-url', 'CANARY_value')).not.toContain('CANARY_value')
  })
})
