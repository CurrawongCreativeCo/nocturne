import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'
import { describe, expect, it, vi } from 'vitest'

import {
  blueprintEnvironment,
  blueprintFeatureChecks,
  buildBlueprint,
  checkBlueprint,
  repoFromChangelog,
  requiredEnvironment,
  SEED,
  seedProfile,
  serialiseBlueprint,
  VERIFICATION,
} from './blueprint-utils.mjs'
import { parseArgs } from './launch-check/args.mjs'
import { parseSnapshot, serialiseSnapshot } from './release-utils.mjs'
import { seedProfiles } from './release.mjs'
import { SEED_PROFILES, seedDocuments } from './setup/seed.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
})
const { featureRegistry } = await jiti.import(join(root, 'src/app/feature-registry.ts'))
const { LAUNCH_STATUSES } = await jiti.import(join(root, 'src/config/profile.ts'))

const SHA = 'f39d2a4c2d7cf1748a914d2b20bd7e2256f70492'
const STAMP = { version: '1.10.0', released: '2026-11-10' }
const REPO = 'https://github.com/CurrawongCreativeCo/nocturne'

const setting = (name, extra = {}) => ({
  name,
  kind: 'server-env',
  where: 'vercel',
  required: false,
  ...extra,
})
const feature = (id, settings, extra = {}) => ({
  id,
  title: id,
  summary: 's',
  why: 'w',
  withoutIt: 'n',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md',
  settings,
  verify: [],
  ...extra,
})

const blueprintFor = (features = featureRegistry) =>
  buildBlueprint({
    version: STAMP.version,
    released: STAMP.released,
    repo: REPO,
    commit: SHA,
    features,
    seedProfiles: seedProfiles(),
  })
const snapshotFor = (features = featureRegistry) =>
  parseSnapshot(serialiseSnapshot(STAMP.version, features), STAMP.version)
const check = (blueprint, features = featureRegistry) =>
  checkBlueprint(serialiseBlueprint(blueprint), { stamp: STAMP, snapshot: snapshotFor(features) })

describe('blueprintEnvironment', () => {
  it('lists each variable once per place, with every feature that uses it, when, and whether it requires it', () => {
    const env = blueprintEnvironment([
      feature(
        'core',
        [
          setting('PROJECT', {
            kind: 'public-env',
            targets: ['production', 'preview'],
            buildTime: true,
            required: true,
          }),
          setting('PROJECT', { kind: 'github-var', where: 'github', required: true }),
        ],
        { tier: 'core' },
      ),
      feature(
        'forms',
        [
          setting('KEY', {
            kind: 'secret',
            required: { when: 'SITE' },
            requiredIn: ['production'],
            generate: 'hex-32',
          }),
        ],
        { profileFlag: 'forms' },
      ),
      feature('news', [setting('KEY', { kind: 'secret', required: false })], {
        switchedBy: ['KEY'],
      }),
    ])
    expect(env).toEqual([
      {
        name: 'PROJECT',
        where: 'vercel',
        kind: 'public-env',
        secret: false,
        targets: ['production', 'preview'],
        buildTime: true,
        need: 'launch',
        uses: [{ feature: 'core', when: { always: true }, required: true }],
      },
      {
        name: 'PROJECT',
        where: 'github',
        kind: 'github-var',
        secret: false,
        buildTime: false,
        need: 'launch',
        uses: [{ feature: 'core', when: { always: true }, required: true }],
      },
      {
        name: 'KEY',
        where: 'vercel',
        kind: 'secret',
        secret: true,
        buildTime: false,
        generate: 'hex-32',
        need: 'when-enabled',
        uses: [
          {
            feature: 'forms',
            when: { profile: 'forms' },
            required: { when: 'SITE' },
            requiredIn: ['production'],
          },
          { feature: 'news', when: { setBy: ['KEY'] }, required: false },
        ],
      },
    ])
  })

  it('tells launch, feature, after-launch and optional configuration apart', () => {
    const env = blueprintEnvironment([
      feature('core', [setting('A', { required: true }), setting('B')], { tier: 'core' }),
      feature('prelaunch', [setting('C', { required: true })], { stage: 'prelaunch' }),
      feature('forms', [setting('D', { required: true })], { profileFlag: 'forms' }),
      feature('hooks', [setting('E', { required: true })]),
      feature('health', [setting('F', { required: true, kind: 'github-var', where: 'github' })], {
        stage: 'after-launch',
      }),
      feature('quiet', [setting('G')]),
    ])
    expect(Object.fromEntries(env.map((entry) => [entry.name, entry.need]))).toEqual({
      A: 'launch',
      B: 'optional',
      C: 'launch',
      D: 'when-enabled',
      E: 'when-enabled',
      F: 'after-launch',
      G: 'optional',
    })
    expect(env.find((entry) => entry.name === 'C').uses[0].when).toEqual({
      launchStatus: 'prelaunch',
    })
    expect(env.find((entry) => entry.name === 'E').uses[0].when).toEqual({ setBy: ['E'] })
  })

  it('leaves out deprecated, planned, system and non-environment settings, and dormant features', () => {
    const env = blueprintEnvironment([
      feature('f', [
        setting('OLD', { deprecated: { replacedBy: 'NEW', migration: 'm', removeWhen: 'w' } }),
        setting('LATER', { planned: '999' }),
        setting('GATE', { kind: 'system' }),
        setting('LOCAL', { kind: 'secret', where: 'local' }),
        setting('FIELD', { kind: 'sanity', where: 'sanity' }),
        setting('KEPT'),
      ]),
      feature('asleep', [setting('ASLEEP')], { dormant: 'Nothing reads it yet.' }),
    ])
    expect(env.map((entry) => entry.name)).toEqual(['KEPT'])
  })

  it('carries no words from the registry, only names and fixed vocabulary', () => {
    const env = blueprintEnvironment([
      feature('f', [
        setting('KEY', {
          kind: 'secret',
          default: 'a default',
          source: 'somewhere',
          purpose: 'why',
          envExample: { placeholder: 'sample' },
        }),
      ]),
    ])
    expect(JSON.stringify(env)).not.toMatch(/a default|somewhere|why|sample/)
  })

  it('from the real registry, covers what Foundation provisions today, with the secrets marked', () => {
    const env = blueprintEnvironment(featureRegistry)
    const vercel = (name) => env.find((entry) => entry.where === 'vercel' && entry.name === name)
    for (const name of [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SITE_URL',
    ]) {
      expect(vercel(name)).toMatchObject({ secret: false, buildTime: true })
    }
    for (const name of ['SANITY_API_READ_TOKEN', 'PREVIEW_ACCESS_SECRET'])
      expect(vercel(name)).toMatchObject({ secret: true })
    expect(vercel('SANITY_API_READ_TOKEN').uses[0]).toEqual({
      feature: 'sanity-core',
      when: { always: true },
      required: true,
      requiredIn: ['production'],
      requiredAtRuntime: true,
    })
    expect(env.some((entry) => entry.name === 'NOCTURNE_CONFIG_GATE')).toBe(false)
    expect(env.every((entry) => /^[A-Z][A-Z0-9_]*$/.test(entry.name))).toBe(true)
  })

  it('from the real registry, only four variables are launch requirements; the rest wait for a feature', () => {
    const env = blueprintEnvironment(featureRegistry)
    expect(
      env.filter((entry) => entry.need === 'launch').map((e) => `${e.where}:${e.name}`),
    ).toEqual([
      'vercel:NEXT_PUBLIC_SANITY_PROJECT_ID',
      'vercel:NEXT_PUBLIC_SANITY_DATASET',
      'vercel:SANITY_API_READ_TOKEN',
      'vercel:PREVIEW_ACCESS_SECRET',
    ])
    const after = env.filter((entry) => entry.need === 'after-launch')
    expect(after.every((entry) => entry.where === 'github')).toBe(true)
  })
})

describe('requiredEnvironment: what one site must set', () => {
  const env = blueprintEnvironment(featureRegistry)
  const names = (selection) =>
    requiredEnvironment(env, selection).map((entry) => `${entry.where}:${entry.name}`)
  const CORE = [
    'vercel:NEXT_PUBLIC_SANITY_PROJECT_ID',
    'vercel:NEXT_PUBLIC_SANITY_DATASET',
    'vercel:SANITY_API_READ_TOKEN',
  ]

  it('a basic pre-launch site needs the three core values and the preview pass, nothing else', () => {
    expect(names({ launchStatus: 'prelaunch' })).toEqual([...CORE, 'vercel:PREVIEW_ACCESS_SECRET'])
    expect(names({ launchStatus: 'live' })).toEqual(CORE)
  })

  it('the read token is needed in every target: the site fails without it, whatever requiredIn says', () => {
    const token = requiredEnvironment(env, { launchStatus: 'live' }).find(
      (entry) => entry.name === 'SANITY_API_READ_TOKEN',
    )
    expect(token).toMatchObject({ secret: true, targets: ['production', 'preview'] })
    expect(token.requiredIn).toBeUndefined()
  })

  it('a feature adds only what it requires, and conditions follow the setting they name', () => {
    expect(names({ launchStatus: 'live', profile: ['forms'] })).toEqual([
      ...CORE,
      'vercel:NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'vercel:TURNSTILE_SECRET_KEY',
      'vercel:RESEND_API_KEY',
      'vercel:FORMS_FROM_EMAIL',
    ])
    // VERCEL_API_TOKEN is required when EDGE_CONFIG is set, and redirects require EDGE_CONFIG.
    expect(names({ launchStatus: 'live', optIn: ['redirects'] })).toEqual([
      ...CORE,
      'vercel:EDGE_CONFIG',
      'vercel:VERCEL_API_TOKEN',
    ])
  })

  it('after-launch configuration is its own step, one feature at a time', () => {
    expect(names({ launchStatus: 'live', afterLaunch: ['health-monitoring'] })).toEqual([
      ...CORE,
      'github:PRODUCTION_URL',
      'github:NEXT_PUBLIC_SANITY_PROJECT_ID',
      'github:SANITY_AUTH_TOKEN',
    ])
  })

  it('keeps requiredIn where it narrows a requirement', () => {
    const narrow = blueprintEnvironment([
      feature('f', [setting('ONLY_PROD', { required: true, requiredIn: ['production'] })], {
        tier: 'core',
      }),
    ])
    expect(requiredEnvironment(narrow, { launchStatus: 'live' })[0].requiredIn).toEqual([
      'production',
    ])
  })

  it('refuses a switch, feature or status it does not know, rather than ignoring it', () => {
    expect(() => names({ launchStatus: 'live', profile: ['shop'] })).toThrow(
      'profile switch "shop"',
    )
    expect(() => names({ launchStatus: 'live', optIn: ['forms'] })).toThrow(
      'optional feature "forms"',
    )
    expect(() => names({ launchStatus: 'live', afterLaunch: ['redirects'] })).toThrow(
      'after-launch feature "redirects"',
    )
    expect(() => names({ launchStatus: 'soon' })).toThrow('launchStatus must be one of')
  })

  it('Foundation can read it from the generated file alone', () => {
    const text = serialiseBlueprint(blueprintFor())
    expect(
      requiredEnvironment(JSON.parse(text).environment, { launchStatus: 'prelaunch' }),
    ).toEqual(requiredEnvironment(env, { launchStatus: 'prelaunch' }))
  })
})

describe('the registry marks stages only where it means something', () => {
  it('no core feature has a stage, and the staged features are the expected ones', () => {
    expect(featureRegistry.filter((f) => f.tier === 'core' && f.stage)).toEqual([])
    expect(
      Object.fromEntries(featureRegistry.filter((f) => f.stage).map((f) => [f.id, f.stage])),
    ).toEqual({
      prelaunch: 'prelaunch',
      'health-monitoring': 'after-launch',
      backups: 'after-launch',
      'enquiry-retention': 'after-launch',
      'sanity-workflow': 'after-launch',
    })
  })
})

describe('the blueprint holds no values', () => {
  it('a release run with every setting set in the environment writes none of them', () => {
    featureRegistry
      .flatMap((f) => f.settings)
      .forEach((s, index) => vi.stubEnv(s.name, `value-that-must-not-leak-${index}`))
    try {
      const text = serialiseBlueprint(blueprintFor())
      expect(text).not.toContain('value-that-must-not-leak')
      expect(check(blueprintFor())).toEqual([])
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('refuses a field it does not know anywhere, so a value has nowhere to go', () => {
    const base = blueprintFor()
    const withValue = { ...base, values: { SANITY_API_READ_TOKEN: 'sk-abc' } }
    expect(check(withValue).join('\n')).toContain("fields it shouldn't: values")

    const env = structuredClone(base)
    env.environment[0].value = 'abc'
    expect(check(env).join('\n')).toContain('"environment" isn\'t what the 1.10.0 registry gives')

    const seed = structuredClone(base)
    seed.seed.profiles[0].token = 'abc'
    expect(check(seed).join('\n')).toContain("seed.profiles[0] has fields it shouldn't: token")

    const source = structuredClone(base)
    source.source.token = 'abc'
    expect(check(source).join('\n')).toContain("source has fields it shouldn't: token")
  })
})

describe('checkBlueprint', () => {
  it('accepts what the release writes from the real registry and seed', () => {
    expect(check(blueprintFor())).toEqual([])
  })

  it('names each problem: version, tag, commit, project types, and a hand-edited list', () => {
    const bad = structuredClone(blueprintFor())
    bad.version = '1.9.0'
    bad.source.tag = 'v1.9.0'
    bad.source.preparedFrom = 'f39d2a4'
    bad.projectTypes = ['website', 'desktop']
    bad.environment.pop()
    const problems = check(bad).join('\n')
    expect(problems).toContain('is for 1.9.0')
    expect(problems).toContain('source.tag must be "v1.10.0"')
    expect(problems).toContain('40-character commit hash')
    expect(problems).toContain('projectTypes must list')
    expect(problems).toContain('"environment" isn\'t')
  })

  it('refuses a schema it does not know before reading anything else', () => {
    const newer = { ...blueprintFor(), schema: 2, environment: 'anything' }
    expect(check(newer)).toEqual([
      'blueprint.json is schema 2, and this checker reads only schema 1.',
    ])
    expect(check({ ...blueprintFor(), schema: undefined })[0]).toContain('schema undefined')
  })

  it('refuses a blueprint the snapshot does not back, and one that is not JSON', () => {
    const text = serialiseBlueprint(blueprintFor())
    expect(checkBlueprint(text, { stamp: STAMP, snapshot: null }).join('\n')).toContain(
      'no config-registry.snapshot.json',
    )
    const other = [feature('only', [setting('ONE')], { verify: ['launch-check'] })]
    const problems = check(blueprintFor(), other).join('\n')
    expect(problems).toContain('"environment"')
    expect(problems).toContain('"verification"')
    expect(checkBlueprint('{', { stamp: STAMP, snapshot: snapshotFor() })).toEqual([
      'blueprint.json is not valid JSON.',
    ])
  })

  it('needs the default seed profile and plain document IDs', () => {
    const bad = structuredClone(blueprintFor())
    bad.seed.profiles = bad.seed.profiles
      .filter((p) => p.id !== SEED.defaultProfile)
      .map((p) => ({ ...p, published: ['not an id'] }))
    const problems = check(bad).join('\n')
    expect(problems).toContain(`no "${SEED.defaultProfile}"`)
    expect(problems).toContain('published must be a list of document IDs')
  })
})

describe('generated parts', () => {
  it('per-feature checks come from the registry', () => {
    expect(blueprintFeatureChecks(featureRegistry)).toEqual(
      featureRegistry.filter((f) => f.verify.length).map((f) => ({ id: f.id, checks: f.verify })),
    )
    expect(blueprintFeatureChecks(featureRegistry).map((f) => f.id)).toContain('sanity-core')
  })

  it('a seed profile lists what the seed creates, published and drafts apart', () => {
    const profile = SEED_PROFILES.find((p) => p.id === 'prelaunch-links')
    const result = seedProfile(profile, seedDocuments('Acme', { prelaunch: true }))
    expect(result.published).toContain('page-links')
    expect(result.drafts).toEqual(['page-home', 'page-about'])
    expect(seedProfiles().find((p) => p.id === 'full-site').drafts).toEqual([])
  })

  it('reads the repository from the CHANGELOG.md compare link', () => {
    expect(repoFromChangelog(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'))).toBe(REPO)
    expect(
      repoFromChangelog('[Unreleased]: https://gitlab.com/a/b/compare/v1.0.0...HEAD'),
    ).toBeNull()
  })
})

describe('the fixed parts describe the template as it is', () => {
  const source = (file) => readFileSync(join(root, file), 'utf8')

  it('the marker: the meta tag the site renders and the field the seed fills', () => {
    expect(source('src/features/site/components/site-marker.tsx')).toContain(
      `<meta name="${VERIFICATION.marker.meta}"`,
    )
    for (const { prelaunch } of SEED_PROFILES) {
      const doc = seedDocuments('Acme Co', { prelaunch }).find(
        (d) => d._id === SEED.marker.document,
      )
      expect(doc[SEED.marker.field]).toBe('nocturne-acme-co')
    }
    expect(VERIFICATION.marker).toMatchObject({
      document: SEED.marker.document,
      field: SEED.marker.field,
    })
  })

  it('/api/site-info: the path, schema and launch statuses', () => {
    expect(source(`src/app${VERIFICATION.siteInfo.path}/route.ts`)).toContain(
      `schema: ${VERIFICATION.siteInfo.schema}`,
    )
    expect(VERIFICATION.siteInfo.statuses).toEqual([...LAUNCH_STATUSES])
  })

  it('launch:check accepts the arguments, and needs only public Sanity settings', () => {
    const options = parseArgs([
      'https://example.com',
      ...VERIFICATION.launchCheck.args,
      VERIFICATION.launchCheck.prelaunchArg,
      `${VERIFICATION.launchCheck.markerArg}nocturne-x`,
    ])
    expect(options).toMatchObject({ json: true, prelaunch: true, expectMarker: 'nocturne-x' })
    source(VERIFICATION.launchCheck.script)
    const env = blueprintEnvironment(featureRegistry)
    for (const name of VERIFICATION.launchCheck.env)
      expect(env.find((e) => e.name === name && e.where === 'vercel')?.secret).toBe(false)
  })

  it('the seed module, export and default profile exist', async () => {
    const seed = await import(join(root, SEED.module))
    expect(typeof seed[SEED.export]).toBe('function')
    expect(SEED_PROFILES.map((p) => p.id)).toContain(SEED.defaultProfile)
  })
})
