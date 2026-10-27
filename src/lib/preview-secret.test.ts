import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getPrelaunchReadiness } from './preview-secret'

const LONG = 'a-test-secret-of-sufficient-length'

describe('getPrelaunchReadiness', () => {
  it('needs the signing secret', () => {
    expect(getPrelaunchReadiness({})).toEqual({
      ready: false,
      missing: ['PREVIEW_ACCESS_SECRET (16 or more characters)'],
    })
  })

  it('treats a short secret as missing and a short link token as a problem', () => {
    const result = getPrelaunchReadiness({
      PREVIEW_ACCESS_SECRET: 'short',
      PRELAUNCH_PREVIEW_TOKEN: 'short',
    })
    expect(result.ready).toBe(false)
    expect('missing' in result && result.missing).toHaveLength(2)
  })

  it('is ready with the secret alone: the client link is optional', () => {
    expect(getPrelaunchReadiness({ PREVIEW_ACCESS_SECRET: LONG })).toEqual({ ready: true })
  })
})

describe('where the secret can travel', () => {
  const root = process.cwd()
  const read = (path: string) => readFileSync(join(root, path), 'utf8')

  it('keeps the pure modules from reading the environment themselves', () => {
    for (const file of [
      'src/lib/preview-secret.ts',
      'src/lib/sanity/revalidate-config.ts',
      'src/lib/edge-config-settings.ts',
    ]) {
      expect(read(file), file).not.toMatch(/process\.env/)
    }
  })

  it('keeps the signing and the cookie in a server-only module', () => {
    expect(read('src/lib/preview-pass.ts')).toMatch(/^import 'server-only'/m)
  })

  it('keeps the registry Studio imports free of readiness code', () => {
    const source = read('src/app/feature-registry.ts')
    expect(source).not.toMatch(/^import .*(readiness-functions|preview-secret|\/utils\/)/m)
  })

  it('is imported by no client component', () => {
    const guarded = [
      'lib/preview-secret',
      'lib/preview-pass',
      'lib/sanity/revalidate-config',
      'lib/edge-config-settings',
      'app/readiness-functions',
      'app/setup-status',
    ]
    const files = readdirSync(join(root, 'src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
      .map((entry) => join(entry.parentPath, entry.name))
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!/^['"]use client['"]/m.test(source)) continue
      for (const name of guarded) expect(source, `${file} imports ${name}`).not.toContain(name)
    }
  })
})
