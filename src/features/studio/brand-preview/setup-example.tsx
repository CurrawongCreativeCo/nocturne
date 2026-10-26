import type { FeatureConfig } from '@/config/feature-config'

import { SetupList } from '../setup/components/setup-screen'
import { buildSetupView, type SetupStatusResponse } from '../setup/utils/setup-view'

const feature = (id: string, title: string, over: Partial<FeatureConfig> = {}): FeatureConfig => ({
  id,
  title,
  summary: `${title} sample.`,
  why: 'Sample.',
  withoutIt: 'Sample.',
  profileFlag: null,
  tier: 'optional',
  since: '1.0.0',
  docs: 'README.md',
  settings: [],
  verify: [],
  ...over,
})

const FEATURES: FeatureConfig[] = [
  feature('forms', 'Contact forms', {
    settings: [{ name: 'SAMPLE_SECRET', kind: 'secret', where: 'vercel', required: true }],
  }),
  feature('health-monitoring', 'Daily health checks', {
    since: '1.8.0',
    settings: [{ name: 'SAMPLE_URL', kind: 'github-var', where: 'github', required: true }],
  }),
  feature('sanity-core', 'Website content'),
  feature('pricing', 'Pricing'),
]

const report = (id: string, status: SetupStatusResponse['features'][number]['status']) => ({
  id,
  title: id,
  tier: 'optional' as const,
  status,
  reason: status === 'not-set-up' ? 'Not set up: SAMPLE_SECRET not set' : status,
  withoutIt: '',
  missing: status === 'not-set-up' ? ['SAMPLE_SECRET'] : [],
  unchecked: [],
  invalid: [],
  planned: [],
  warnings: [],
})

const STATUS: SetupStatusResponse = {
  schema: 1,
  environment: { kind: 'production', label: 'Vercel Production' },
  features: [
    report('forms', 'not-set-up'),
    report('health-monitoring', 'cant-check'),
    report('sanity-core', 'ready'),
    report('pricing', 'off'),
  ],
  pending: [],
  templateVersion: '1.8.0',
  tier: 'standard',
  enabled: {},
  commit: 'abc1234def5678',
  builtAt: '2026-10-26T09:14:00+11:00',
}

/**
 * The Features & setup list with sample content, with a status and as explanations only, for the
 * accessibility and screenshot tests (README, "Studio brand preview"). Static: the real pane asks
 * `/api/setup-status`.
 */
export function SetupExample({ mode }: { mode: 'status' | 'explanations' }) {
  const view = buildSetupView({
    features: FEATURES,
    status: mode === 'status' ? STATUS : null,
    noStatusReason: 'refused',
  })
  return (
    <div data-setup-example={mode}>
      <SetupList view={view} onOpen={() => undefined} titleAs="h3" />
    </div>
  )
}
