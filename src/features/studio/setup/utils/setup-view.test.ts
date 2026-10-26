import { describe, expect, it } from 'vitest'

import type { FeatureConfig } from '@/config/feature-config'
import type { FeatureReport } from '@/lib/config/evaluate'

import {
  attentionCount,
  buildFeatureDetail,
  buildSetupView,
  isGithubBacked,
  minorOf,
  type SetupStatusResponse,
} from './setup-view'
import { featuresNeedSetupLine } from './setup-wording'

const feature = (over: Partial<FeatureConfig> & { id: string }): FeatureConfig => ({
  title: over.id,
  summary: `${over.id} does something.`,
  why: 'Because.',
  withoutIt: 'Nothing happens.',
  profileFlag: null,
  tier: 'optional',
  since: '1.0.0',
  docs: 'README.md#x',
  settings: [],
  verify: [],
  ...over,
})

const forms = feature({
  id: 'forms',
  title: 'Contact forms',
  settings: [
    {
      name: 'TURNSTILE_SECRET_KEY',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      source: 'Cloudflare → Turnstile → your widget',
    },
    {
      name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      kind: 'public-env',
      where: 'vercel',
      buildTime: true,
      required: true,
    },
    { name: 'FORMS_BCC', kind: 'server-env', where: 'vercel', required: false },
  ],
})
const health = feature({
  id: 'health-monitoring',
  title: 'Daily health checks',
  since: '1.8.0',
  setup: ['Add the repository variables.', 'Run the workflow once.'],
  settings: [{ name: 'PRODUCTION_URL', kind: 'github-var', where: 'github', required: true }],
})
const pricing = feature({ id: 'pricing', title: 'Pricing', profileFlag: 'pricing' })
const core = feature({
  id: 'sanity-core',
  title: 'Website content',
  settings: [
    { name: 'NEXT_PUBLIC_SANITY_PROJECT_ID', kind: 'public-env', where: 'vercel', required: true },
  ],
})
const registry = [forms, health, pricing, core]

const report = (id: string, over: Partial<FeatureReport> = {}): FeatureReport => ({
  id,
  title: id,
  tier: 'optional',
  status: 'ready',
  reason: 'Ready',
  withoutIt: '',
  missing: [],
  unchecked: [],
  invalid: [],
  planned: [],
  warnings: [],
  ...over,
})

const status = (
  features: FeatureReport[],
  over: Partial<SetupStatusResponse> = {},
): SetupStatusResponse => ({
  schema: 1,
  environment: { kind: 'production', label: 'Vercel Production' },
  features,
  pending: [],
  templateVersion: '1.8.0',
  tier: 'standard',
  enabled: {},
  commit: 'abc1234def5678',
  builtAt: '2026-10-26T09:14:00+11:00',
  ...over,
})

const typical = status([
  report('forms', {
    status: 'not-set-up',
    reason: 'Not set up: TURNSTILE_SECRET_KEY not set',
    missing: ['TURNSTILE_SECRET_KEY'],
  }),
  report('health-monitoring', { status: 'cant-check' }),
  report('pricing', { status: 'off', reason: 'Off in profile' }),
  report('sanity-core'),
])

describe('buildSetupView with a status', () => {
  it('groups features: needs attention, can’t be checked, ready, off in profile', () => {
    const view = buildSetupView({ features: registry, status: typical })
    expect(view.mode).toBe('status')
    expect(view.groups.map((group) => [group.title, group.rows.map((row) => row.id)])).toEqual([
      ['Needs attention', ['forms']],
      ["Can't be checked from here", ['health-monitoring']],
      ['Ready', ['sanity-core']],
      ["Off in this site's profile", ['pricing']],
    ])
    expect(view.attentionCount).toBe(1)
  })

  it('leaves out empty groups', () => {
    const view = buildSetupView({ features: [core], status: status([report('sanity-core')]) })
    expect(view.groups.map((group) => group.id)).toEqual(['ready'])
  })

  it('gives the reason a feature is not set up', () => {
    const row = buildSetupView({ features: registry, status: typical }).groups[0]?.rows[0]
    expect(row?.message).toBe('Not set up: TURNSTILE_SECRET_KEY not set')
    expect(row?.statusLabel).toBe('Not set up')
  })

  it('shows the deployment header with a short commit and the build time in en-AU', () => {
    const { header, footer } = buildSetupView({ features: registry, status: typical })
    expect(header).toMatch(/^This deployment: abc1234 · 26 Oct 2026, 9:14 am (AEDT|GMT\+11)$/)
    expect(footer).toBe('Changes to these settings apply after the next deployment.')
  })

  it('says so when the commit or build time is not recorded', () => {
    const { header } = buildSetupView({
      features: registry,
      status: status([], { commit: null, builtAt: null }),
    })
    expect(header).toBe('This deployment: commit not recorded · build time not recorded')
  })

  it('lists what is new in the current minor version, with no stored state', () => {
    const view = buildSetupView({ features: registry, status: typical })
    expect(view.newIn?.label).toBe('New in 1.8')
    expect(view.newIn?.rows.map((row) => row.id)).toEqual(['health-monitoring'])
    expect(
      buildSetupView({ features: registry, status: { ...typical, templateVersion: '1.9.0' } })
        .newIn,
    ).toBeNull()
  })

  it('never shows a GitHub-backed feature as Ready', () => {
    const view = buildSetupView({
      features: [health],
      status: status([report('health-monitoring', { status: 'ready' })]),
    })
    expect(view.groups.map((group) => group.id)).toEqual(['cant-check'])
    expect(view.groups[0]?.rows[0]?.message).toContain('npm run config:check -- --github')
    expect(view.groups[0]?.rows[0]?.message).toContain('Actions')
  })

  it('treats a feature the deployment did not report as unable to be checked', () => {
    const view = buildSetupView({ features: [core], status: status([]) })
    expect(view.groups.map((group) => group.id)).toEqual(['cant-check'])
  })

  it('counts only features that are not set up', () => {
    expect(attentionCount(typical)).toBe(1)
    expect(attentionCount(null)).toBe(0)
    expect(featuresNeedSetupLine(0)).toBeNull()
    expect(featuresNeedSetupLine(1)).toBe('1 feature needs setup')
    expect(featuresNeedSetupLine(2)).toBe('2 features need setup')
  })
})

describe('buildSetupView without a status', () => {
  const view = buildSetupView({ features: registry, status: null, noStatusReason: 'no-token' })

  it('shows every feature’s explanation and no status at all', () => {
    expect(view.mode).toBe('explanations')
    expect(view.rows.map((row) => row.id)).toEqual(registry.map((item) => item.id))
    expect(view.groups).toEqual([])
    expect(view.header).toBeNull()
    expect(view.newIn).toBeNull()
    expect(view.attentionCount).toBe(0)
    for (const row of view.rows) {
      expect(row.group).toBeNull()
      expect(row.statusLabel).toBeNull()
      expect(row.message).toBe(row.summary)
    }
  })

  it('says where to check readiness, and why there is no status', () => {
    expect(view.note).toContain('Check readiness with `npm run config:check` or Foundation.')
    expect(view.note).toContain('cookie')
    expect(
      buildSetupView({ features: registry, status: null, noStatusReason: 'refused' }).note,
    ).toContain("didn't accept your sign-in")
  })
})

describe('buildFeatureDetail', () => {
  it('has what it does, why, what happens without it, and what it needs', () => {
    const detail = buildFeatureDetail(forms, typical)
    expect(detail.whatItDoes).toBe('forms does something.')
    expect(detail.why).toBe('Because.')
    expect(detail.withoutIt).toBe('Nothing happens.')
    expect(detail.needs.map((need) => need.name)).toEqual([
      'TURNSTILE_SECRET_KEY',
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'FORMS_BCC',
    ])
  })

  it('says where each setting is set, when it is read, and whether this deployment has it', () => {
    const [secret, siteKey, optional] = buildFeatureDetail(forms, typical).needs
    expect(secret).toMatchObject({
      where: 'Vercel → Settings → Environment Variables',
      targets: 'production, preview',
      timing: 'Read while the site runs',
      requirement: 'Needed',
      presence: 'Not set',
      source: 'Cloudflare → Turnstile → your widget',
    })
    expect(siteKey).toMatchObject({ timing: 'Built into the pages', presence: 'Set' })
    expect(optional).toMatchObject({ requirement: 'Optional', presence: null })
  })

  it('says a setting with the wrong shape needs fixing', () => {
    const detail = buildFeatureDetail(
      forms,
      status([
        report('forms', {
          status: 'not-set-up',
          invalid: [
            { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', problem: 'is blank', suggestion: 'x' },
          ],
        }),
      ]),
    )
    expect(detail.needs[1]?.presence).toBe('Set, but needs fixing')
  })

  it('shows GitHub settings as unable to be checked from here', () => {
    const detail = buildFeatureDetail(health, typical)
    expect(detail.needs[0]?.presence).toBe("Can't be checked from here")
    expect(detail.statusLabel).toBe("Can't be checked from here")
    expect(detail.howToCheck).toContain('npm run config:check -- --github')
  })

  it('numbers the written steps and ends with the redeploy step', () => {
    expect(buildFeatureDetail(health, typical).steps).toEqual([
      'Add the repository variables.',
      'Run the workflow once.',
      'Redeploy, then reopen this pane.',
    ])
  })

  it('writes steps from the needed settings when the entry has none', () => {
    const steps = buildFeatureDetail(forms, typical).steps
    expect(steps[0]).toBe(
      'Set TURNSTILE_SECRET_KEY in Vercel → Settings → Environment Variables. Cloudflare → Turnstile → your widget.',
    )
    expect(steps.at(-1)).toBe('Redeploy, then reopen this pane.')
  })

  it('keeps a technical details list of names, kinds and targets', () => {
    const [secret] = buildFeatureDetail(forms, typical).technical
    expect(secret?.name).toBe('TURNSTILE_SECRET_KEY')
    expect(secret?.details).toEqual(
      expect.arrayContaining(['Kind: secret', 'Targets: production, preview']),
    )
  })

  it('has no status, and says how to check, without a status', () => {
    const detail = buildFeatureDetail(forms, null)
    expect(detail.statusLabel).toBeNull()
    expect(detail.message).toBeNull()
    expect(detail.needs.every((need) => need.presence === null)).toBe(true)
    expect(detail.howToCheck).toBe('Check readiness with `npm run config:check` or Foundation.')
    expect(detail.steps.at(-1)).toBe('Redeploy, then reopen this pane.')
  })
})

describe('helpers', () => {
  it('finds the minor version', () => {
    expect(minorOf('1.9.0')).toBe('1.9')
    expect(minorOf('1.10.2')).toBe('1.10')
    expect(minorOf('next')).toBeNull()
  })

  it('knows which features live in GitHub', () => {
    expect(isGithubBacked(health)).toBe(true)
    expect(isGithubBacked(forms)).toBe(false)
  })

  it('uses Australian English', () => {
    const view = buildSetupView({ features: registry, status: typical })
    const text = JSON.stringify([view, buildFeatureDetail(health, typical)])
    expect(text).not.toMatch(/\b(color|organize|customize|initialize)/i)
  })
})
