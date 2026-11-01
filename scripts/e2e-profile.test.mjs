import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { e2eProfileAlias, FIXED_PROFILE, PROFILE_SPECIFIER } from './e2e-profile.mjs'
import { isTemplateRepo } from './is-template.mjs'

describe('e2eProfileAlias', () => {
  it('is empty for an ordinary build, so the real site profile is used', () => {
    expect(e2eProfileAlias({})).toEqual({})
    expect(e2eProfileAlias({ NODE_ENV: 'production' })).toEqual({})
  })

  it('ignores any value other than 1', () => {
    for (const value of ['', '0', 'true', 'yes']) {
      expect(e2eProfileAlias({ E2E_FIXED_PROFILE: value })).toEqual({})
    }
  })

  it('swaps in the template profile when an end-to-end build asks for it', () => {
    expect(e2eProfileAlias({ E2E_FIXED_PROFILE: '1' })).toEqual({
      [PROFILE_SPECIFIER]: FIXED_PROFILE,
    })
  })

  it('is refused in every Vercel build: Preview, Production and Development', () => {
    for (const env of [
      { VERCEL: '1' },
      { VERCEL_ENV: 'preview' },
      { VERCEL_ENV: 'production' },
      { VERCEL_ENV: 'development' },
    ]) {
      expect(() => e2eProfileAlias({ E2E_FIXED_PROFILE: '1', ...env })).toThrow(
        /refused in Vercel builds/,
      )
    }
  })

  it('does not interfere on Vercel when the flag is not set', () => {
    expect(e2eProfileAlias({ VERCEL: '1', VERCEL_ENV: 'production' })).toEqual({})
  })

  it('names the import that src/config/profile.ts really uses', () => {
    const source = readFileSync(new URL('../src/config/profile.ts', import.meta.url), 'utf8')
    expect(source).toContain(`from '${PROFILE_SPECIFIER}'`)
  })

  it('points at a profile that exists and imports from the right place', () => {
    const fixture = readFileSync(
      new URL('../tests/e2e/fixtures/site.profile.ts', import.meta.url),
      'utf8',
    )
    expect(FIXED_PROFILE).toBe('./tests/e2e/fixtures/site.profile.ts')
    expect(fixture).toContain("from '../../../src/config/define-site-profile'")
  })

  // The fixture is the template's own profile; a client's differs on purpose, so only the template checks.
  it.skipIf(!isTemplateRepo())(
    'matches the template site.profile.ts apart from its import path and the services and locations flags',
    () => {
      const real = readFileSync(new URL('../site.profile.ts', import.meta.url), 'utf8')
      const fixture = readFileSync(
        new URL('../tests/e2e/fixtures/site.profile.ts', import.meta.url),
        'utf8',
      )
      // `services` and `locations` are off in the template (plan features) and on in the fixture so the suite covers it.
      const body = (text) =>
        text
          .split('\n')
          .slice(1)
          .filter(
            (line) =>
              !/^\s*(\/\/ The one difference.*|services: true,|locations: true,)$/.test(line),
          )
          .join('\n')
      expect(body(fixture)).toBe(body(real))
    },
  )
})
