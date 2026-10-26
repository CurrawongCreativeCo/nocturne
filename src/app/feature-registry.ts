import type { FeatureConfig } from '@/config/feature-config'
import { formsConfig } from '@/features/forms/config.registry'
import { getFormsConfig } from '@/features/forms/utils/config'
import { configControlsConfig } from '@/lib/config/controls.registry'
import type { Env } from '@/lib/config/environment'
import type { Readiness } from '@/lib/config/evaluate'
import { healthMonitoringConfig } from '@/lib/ops/health-config.registry'
import { sanityCoreConfig } from '@/lib/sanity/config.registry'

/**
 * The feature configuration registry, composed once (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md,
 * §B.3). Read by `config:check` (scripts/config-check.mjs, loaded with jiti) and by `getSetupStatus()`
 * (src/app/setup-status.ts). No `server-only` here, so the script can load it; nothing public may
 * import `setup-status.ts`. Registry files hold names and words, never values.
 *
 * Shared code can't import features, so this is where the entries meet the readiness functions.
 */

/** The existing functions a registry entry's `readiness` names. Each one reads the env it is given. */
export const readinessFunctions: Record<string, (env: Env) => Readiness> = {
  getFormsConfig: (env) => getFormsConfig(env),
}

export const featureRegistry: readonly FeatureConfig[] = [
  sanityCoreConfig,
  formsConfig,
  healthMonitoringConfig,
  configControlsConfig,
]

/**
 * Features whose settings aren't registered yet (task 233 registers them and deletes this list).
 * The completeness test counts these names as known, so it passes from day one.
 */
export const pending: readonly { feature: string; settings: readonly string[] }[] = [
  {
    feature: 'site',
    settings: ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SITE_LANGUAGE', 'SITE_LAUNCH_OVERRIDE'],
  },
  { feature: 'studio-brand', settings: ['NEXT_PUBLIC_STUDIO_TITLE'] },
  { feature: 'webhook-mode', settings: ['SANITY_REVALIDATE_SECRET'] },
  { feature: 'indexnow', settings: ['INDEXNOW_KEY'] },
  {
    feature: 'redirects',
    settings: ['EDGE_CONFIG', 'EDGE_CONFIG_ID', 'VERCEL_API_TOKEN', 'VERCEL_TEAM_ID'],
  },
  {
    feature: 'enquiries',
    settings: ['ENQUIRIES_STORE', 'SANITY_WRITE_TOKEN', 'ENQUIRY_RETENTION_DAYS'],
  },
  {
    feature: 'newsletter',
    settings: [
      'NEWSLETTER_PROVIDER',
      'NEWSLETTER_RESEND_SEGMENT_ID',
      'LOOPS_API_KEY',
      'LOOPS_MAILING_LIST_ID',
      'MAILCHIMP_API_KEY',
      'MAILCHIMP_LIST_ID',
    ],
  },
  { feature: 'pricing', settings: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  { feature: 'prelaunch', settings: ['PREVIEW_ACCESS_SECRET', 'PRELAUNCH_PREVIEW_TOKEN'] },
  { feature: 'style-guide', settings: ['STYLEGUIDE_PREVIEW_TOKEN'] },
  { feature: 'experiments', settings: ['FLAGS_SECRET', 'EXPERIMENT_CACHE_SECONDS'] },
  {
    feature: 'analytics',
    settings: [
      'NEXT_PUBLIC_PLAUSIBLE_DOMAIN',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_POSTHOG_HOST',
      'NEXT_PUBLIC_GA_ID',
    ],
  },
  {
    feature: 'members',
    settings: [
      'AUTH_SECRET',
      'AUTH_GITHUB_ID',
      'AUTH_GITHUB_SECRET',
      'AUTH_GOOGLE_ID',
      'AUTH_GOOGLE_SECRET',
      'AUTH_ALLOWED_EMAILS',
      'AUTH_TRUST_HOST',
    ],
  },
  {
    feature: 'error-tracking',
    settings: [
      'SENTRY_DSN',
      'SENTRY_TRACES_SAMPLE_RATE',
      'SENTRY_AUTH_TOKEN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
    ],
  },
  { feature: 'start-here', settings: ['OPS_NOTICES_URL', 'OPS_NOTICES_KEY'] },
  { feature: 'launch-check', settings: ['PSI_API_KEY', 'VERCEL_AUTOMATION_BYPASS_SECRET'] },
  {
    feature: 'backups',
    settings: [
      'BACKUP_S3_ACCESS_KEY_ID',
      'BACKUP_S3_BUCKET',
      'BACKUP_S3_ENDPOINT',
      'BACKUP_S3_PREFIX',
      'BACKUP_S3_REGION',
      'BACKUP_S3_SECRET_ACCESS_KEY',
    ],
  },
  { feature: 'sanity-workflow', settings: ['SANITY_DEPLOY_TOKEN', 'SANITY_MIGRATION_READ_TOKEN'] },
]

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
  { name: 'VERCEL_ENV', reason: 'Set by Vercel' },
  { name: 'VERCEL_GIT_COMMIT_SHA', reason: 'Set by Vercel' },
  { name: 'VERCEL_PROJECT_PRODUCTION_URL', reason: 'Set by Vercel' },
  { name: 'GITHUB_OUTPUT', reason: 'Set by GitHub Actions' },
  { name: 'GITHUB_STEP_SUMMARY', reason: 'Set by GitHub Actions' },
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
]
