import type { HistoricalFixture } from '@/lib/config/compat'

/**
 * Configurations that were valid when 1.8.0 shipped, written by hand from the README's setup
 * instructions rather than generated from the registry (src/lib/config/compat.ts, checkHistoricalFixtures).
 * Values are made up and the right shape; none is real. Add a fixture when a release changes how a
 * critical feature reads its settings. Never edit one to make a test pass: that is the break the test
 * exists to catch. Retire it only on purpose, with a release note.
 */
export const historicalFixtures: readonly HistoricalFixture[] = [
  {
    id: 'sanity-core@1.8.0',
    featureId: 'sanity-core',
    env: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc12345',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
      SANITY_API_READ_TOKEN: 'sk-made-up-viewer-token',
    },
    note: 'A working site: the two values env.ts needs and the Viewer token, which src/lib/sanity/token.ts has always required to read content, on a public dataset as much as a private one. A site without the token has never worked.',
  },
  {
    id: 'forms@1.8.0',
    featureId: 'forms',
    env: {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAmadeup',
      TURNSTILE_SECRET_KEY: '0x4AAAAAAAmadeup-secret',
      RESEND_API_KEY: 're_madeup1234567890',
      FORMS_FROM_EMAIL: 'Acme <forms@acme.example.com.au>',
    },
    note: 'Contact forms: Turnstile, Resend and a sender on a verified domain.',
  },
  {
    id: 'newsletter@1.8.0',
    featureId: 'newsletter',
    env: {
      NEWSLETTER_PROVIDER: 'resend',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAmadeup',
      TURNSTILE_SECRET_KEY: '0x4AAAAAAAmadeup-secret',
      RESEND_API_KEY: 're_madeup1234567890',
      RESEND_AUDIENCE_ID: 'aud_madeup',
    },
    note: 'Newsletter signup through Resend.',
  },
  {
    id: 'redirects@1.8.0',
    featureId: 'redirects',
    env: {
      EDGE_CONFIG: 'https://edge-config.vercel.com/ecfg_madeup1234?token=madeup-read-token',
      EDGE_CONFIG_ID: 'ecfg_madeup1234',
      VERCEL_API_TOKEN: 'madeup-vercel-token',
    },
    note: 'Edge Config redirects with the sync token.',
  },
  {
    id: 'webhook-mode@1.8.0',
    featureId: 'webhook-mode',
    env: { SANITY_REVALIDATE_SECRET: 'madeup-secret-0123456789abcdef' },
    note: 'Webhook revalidation.',
  },
  {
    id: 'members@1.8.0',
    featureId: 'members',
    env: {
      AUTH_SECRET: 'madeup-auth-secret-0123456789abcdef0123456789',
      AUTH_GITHUB_ID: 'madeup-id',
      AUTH_GITHUB_SECRET: 'madeup-secret',
    },
    note: 'Members sign in with GitHub.',
  },
]
