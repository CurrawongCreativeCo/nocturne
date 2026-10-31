import type { FeatureConfig } from '@/config/feature-config'
import { siteConfig } from '@/config/site.registry'
import { studioBrandConfig } from '@/config/studio-brand/config.registry'
import { membersConfig } from '@/features/auth/config.registry'
import { analyticsConfig } from '@/features/consent/config.registry'
import { experimentsConfig } from '@/features/experiments/config.registry'
import { formsConfig } from '@/features/forms/config.registry'
import { enquiriesConfig } from '@/features/forms/enquiries.registry'
import { newsletterConfig } from '@/features/forms/newsletter.registry'
import { pricingConfig } from '@/features/pricing/config.registry'
import { publishGateConfig } from '@/features/publish-gate/config.registry'
import { configControlsConfig } from '@/lib/config/controls.registry'
import { indexNowConfig } from '@/lib/indexnow.registry'
import { backupsConfig } from '@/lib/ops/backup.registry'
import { healthMonitoringConfig } from '@/lib/ops/health-config.registry'
import { launchCheckConfig } from '@/lib/ops/launch-check.registry'
import { opsNoticesConfig } from '@/lib/ops/notices.registry'
import { enquiryRetentionConfig } from '@/lib/ops/retention.registry'
import { sanityWorkflowConfig } from '@/lib/ops/sanity-workflow.registry'
import { prelaunchConfig } from '@/lib/prelaunch.registry'
import { redirectsConfig } from '@/lib/redirects.registry'
import { sanityCoreConfig } from '@/lib/sanity/config.registry'
import { webhookModeConfig } from '@/lib/sanity/revalidate.registry'
import { errorTrackingConfig } from '@/lib/sentry/config.registry'
import { styleGuideConfig } from '@/lib/styleguide.registry'

/**
 * The feature configuration registry, composed once (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md,
 * §B.3). Read by `config:check` (scripts/config-check.mjs, loaded with jiti), by `getSetupStatus()`
 * (src/app/setup-status.ts) and by `npm run config:docs`, which writes `.env.example` and the README's
 * settings table from it. No `server-only` here, so the scripts can load it; nothing public may
 * import `setup-status.ts`. Registry files hold names and words, never values, and Studio imports this
 * file, so it imports no readiness code: that is `readiness-functions.ts`.
 */

/**
 * In the order `.env.example` and the README table list them. A setting several features use
 * (`SANITY_WRITE_TOKEN`, the Turnstile keys) is described where it first appears.
 */
export const featureRegistry: readonly FeatureConfig[] = [
  sanityCoreConfig,
  siteConfig,
  studioBrandConfig,
  webhookModeConfig,
  redirectsConfig,
  formsConfig,
  enquiriesConfig,
  newsletterConfig,
  pricingConfig,
  publishGateConfig,
  indexNowConfig,
  styleGuideConfig,
  prelaunchConfig,
  experimentsConfig,
  analyticsConfig,
  membersConfig,
  errorTrackingConfig,
  opsNoticesConfig,
  healthMonitoringConfig,
  backupsConfig,
  enquiryRetentionConfig,
  sanityWorkflowConfig,
  launchCheckConfig,
  configControlsConfig,
]

/**
 * Features whose settings aren't registered. Empty since task 233 registered the rest; a feature
 * added later registers in the same change, so the completeness test never needs this list. It stays
 * so the report's `pending` field keeps its shape.
 */
export const pending: readonly { feature: string; settings: readonly string[] }[] = []

/**
 * Names the completeness test lets through without a registry entry: tests and tooling, platform
 * variables and values derived from registered ones (§A.2's last row). A trailing `*` matches a prefix.
 */
export const ignored: readonly { name: string; reason: string }[] = [
  { name: 'NODE_ENV', reason: 'Set by Node and Next.js' },
  { name: 'CI', reason: 'Set by CI and Vercel; the gate reads it to recognise a fake-data build' },
  { name: 'PORT', reason: 'Tooling: the port a script serves on' },
  { name: 'NO_COLOR', reason: 'Tooling: the standard switch for coloured output' },
  { name: 'BUILT_AT', reason: 'Stamped by next.config.ts at build time' },
  {
    name: 'VERCEL',
    reason: 'Set by Vercel (scripts/e2e-profile.mjs refuses a test profile in any Vercel build)',
  },
  { name: 'VERCEL_ENV', reason: 'Set by Vercel' },
  { name: 'VERCEL_GIT_COMMIT_SHA', reason: 'Set by Vercel' },
  { name: 'VERCEL_PROJECT_PRODUCTION_URL', reason: 'Set by Vercel' },
  { name: 'GITHUB_OUTPUT', reason: 'Set by GitHub Actions' },
  { name: 'GITHUB_STEP_SUMMARY', reason: 'Set by GitHub Actions' },
  {
    name: 'GITHUB_TOKEN',
    reason:
      'Tooling: config:check --github reads it from the environment for one run; never stored or printed',
  },
  { name: 'GH_TOKEN', reason: "Workflow plumbing: the job's own github.token" },
  { name: 'GH_REPO', reason: 'Workflow plumbing: the repository the job runs in' },
  { name: 'RUN_URL', reason: 'Workflow plumbing: the link to the run, for the issue text' },
  { name: 'NEXT_PUBLIC_SENTRY_DSN', reason: 'Copied from SENTRY_DSN by next.config.ts' },
  {
    name: 'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE',
    reason: 'Copied from SENTRY_TRACES_SAMPLE_RATE by next.config.ts',
  },
  {
    name: 'FORMS_TEST_MODE',
    reason: 'Tests: mocks Turnstile and Resend; ignored on Vercel production',
  },
  { name: 'AUTH_TEST_MODE', reason: 'Tests: password sign-in; ignored on Vercel production' },
  { name: 'AUTH_TEST_PASSWORD', reason: 'Tests: the password for AUTH_TEST_MODE' },
  { name: 'SANITY_API_HOST', reason: 'Tests: points the app at the fake Content Lake' },
  { name: 'STRIPE_API_HOST', reason: 'Tests: points the app at the fake Stripe' },
  { name: 'FAKE_SANITY_PORT', reason: 'Tests: the fake Content Lake port' },
  { name: 'NEXT_DIST_DIR', reason: 'Tooling: a scratch build directory' },
  { name: 'E2E_*', reason: 'Tests: end-to-end switches' },
  { name: 'STUDIO_PERF_*', reason: 'Tests: the Studio performance harness' },
  {
    name: 'VERCEL_SPIKE_*',
    reason:
      'Tooling: scripts/spikes/vercel-tokens.mjs (task 235), scratch project and tokens, read for one run and never printed',
  },
]
