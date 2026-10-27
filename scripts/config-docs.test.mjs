import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createJiti } from 'jiti'
import { describe, expect, it } from 'vitest'

import {
  README_END,
  README_START,
  buildEnvExample,
  buildSettingsBlock,
  collectRows,
  spliceBlock,
  wrap,
} from './config-docs-utils.mjs'

const setting = (name, extra = {}) => ({
  name,
  kind: 'server-env',
  where: 'vercel',
  targets: ['production', 'preview'],
  required: false,
  purpose: `Purpose of ${name}.`,
  ...extra,
})

const registry = [
  {
    id: 'one',
    title: 'Feature one',
    summary: 'Does one thing',
    tier: 'optional',
    docs: 'README.md#one',
    settings: [
      setting('ONE_SECRET', { kind: 'secret', required: true, source: 'The dashboard' }),
      setting('ONE_URL', { envExample: { placeholder: 'https://example.com', commented: true } }),
      setting('ONE_OLD', {
        envExample: false,
        deprecated: { replacedBy: 'ONE_URL', migration: 'Move it', removeWhen: 'Someone says' },
      }),
      setting('ONE_FLAG', { kind: 'github-var', where: 'github', targets: undefined }),
    ],
  },
  {
    id: 'two',
    title: 'Feature two',
    summary: 'Does another thing.',
    tier: 'optional',
    docs: 'README.md#two',
    settings: [
      setting('ONE_SECRET', { kind: 'secret', required: true }),
      setting('TWO_KEY', { required: { when: 'ONE_SECRET' }, purpose: 'Has a | pipe and <angle>' }),
    ],
  },
  {
    id: 'three',
    title: 'Only GitHub',
    summary: 'Lives in GitHub.',
    tier: 'optional',
    docs: 'README.md#three',
    settings: [
      setting('GH_TOKEN_X', { kind: 'github-secret', where: 'github', targets: undefined }),
    ],
  },
]

describe('buildEnvExample', () => {
  const text = buildEnvExample(registry)

  it('writes a secret as an empty slot and a placeholder as a comment when asked', () => {
    expect(text).toContain('\nONE_SECRET=""\n')
    expect(text).toContain('\n# ONE_URL="https://example.com"\n')
  })

  it('leaves out deprecated names, GitHub settings and features that are only in GitHub', () => {
    expect(text).not.toContain('ONE_OLD')
    expect(text).not.toContain('ONE_FLAG')
    expect(text).not.toContain('GH_TOKEN_X')
    expect(text).not.toContain('Only GitHub')
  })

  it('lists a shared setting once and points to it from the second feature', () => {
    expect(text.match(/^ONE_SECRET=/gm)).toHaveLength(1)
    expect(text).toContain('Also uses ONE_SECRET, set above.')
    expect(text).toContain('\nTWO_KEY=""\n')
  })

  it('wraps comments and ends with a newline', () => {
    expect(text.endsWith('\n')).toBe(true)
    for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(100)
  })

  it('is stable', () => {
    expect(buildEnvExample(registry)).toBe(text)
  })
})

describe('the README block', () => {
  const block = buildSettingsBlock(registry)

  it('has one row per setting and place, naming every feature that uses it', () => {
    expect(collectRows(registry)).toHaveLength(6)
    expect(block).toMatch(/`ONE_SECRET` \| Feature one, Feature two \|/)
  })

  it('says what is needed, including deprecated and conditional', () => {
    expect(block).toContain('| Required |')
    expect(block).toContain('| Deprecated |')
    expect(block).toContain('Required with `ONE_SECRET`')
  })

  it("can't break the table or invent HTML", () => {
    expect(block).toContain('Has a \\| pipe and &lt;angle&gt;')
  })

  it('names where GitHub settings live', () => {
    expect(block).toContain('GitHub variable')
    expect(block).toContain('GitHub secret')
  })

  it('starts and ends with the markers', () => {
    expect(block.startsWith(README_START)).toBe(true)
    expect(block.endsWith(README_END)).toBe(true)
  })
})

describe('spliceBlock', () => {
  it('replaces what is between the markers and nothing else', () => {
    const readme = `before\n${README_START}\nold\n${README_END}\nafter\n`
    const next = spliceBlock(readme, `${README_START}\nnew\n${README_END}`)
    expect(next).toBe(`before\n${README_START}\nnew\n${README_END}\nafter\n`)
  })

  it('refuses a README without the markers', () => {
    expect(spliceBlock('nothing here', 'x')).toBeNull()
  })
})

describe('wrap', () => {
  it('breaks on words', () => {
    expect(wrap('aaa bbb ccc', '# ')).toEqual(['# aaa bbb ccc'])
    expect(wrap(`${'word '.repeat(30)}`, '# ').every((line) => line.length <= 100)).toBe(true)
  })
})

describe('the committed files', () => {
  it('are current: `npm run config:docs` has been run', () => {
    const result = spawnSync('node', [join(process.cwd(), 'scripts/config-docs.mjs'), '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    expect(`${result.stdout}${result.stderr}`).toContain('current')
    expect(result.status).toBe(0)
    // It starts a second Node process and compiles the whole registry, which takes seconds on a busy
    // machine (it timed out at the 5 s default in CI-like runs).
  }, 30_000)
})

describe('.env.example holds placeholders, never live values', () => {
  const jiti = createJiti(import.meta.url, {
    alias: { '@': join(process.cwd(), 'src') },
    interopDefault: true,
  })

  it('has an empty value for every secret and only registry placeholders elsewhere', async () => {
    const { featureRegistry } = await jiti.import(
      join(process.cwd(), 'src/app/feature-registry.ts'),
    )
    const settings = new Map()
    for (const s of featureRegistry.flatMap((f) => f.settings)) {
      if (s.where !== 'github' && !settings.has(s.name)) settings.set(s.name, s)
    }
    const lines = readFileSync(join(process.cwd(), '.env.example'), 'utf8').split('\n')
    const assignments = lines
      .map((line) => /^#? ?([A-Z][A-Z0-9_]*)="(.*)"$/.exec(line))
      .filter(Boolean)
    expect(assignments.length).toBeGreaterThan(30)
    for (const match of assignments) {
      const [, name, value] = match
      const setting = settings.get(name)
      expect(setting, name).toBeDefined()
      if (value === '') continue
      expect(['secret', 'github-secret'], name).not.toContain(setting.kind)
      expect(value, name).toBe(setting.envExample?.placeholder)
    }
  })
})
