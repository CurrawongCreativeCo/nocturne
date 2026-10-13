/** Shared by playwright.config.ts and the specs. */
export const APP_PORT = 3100
export const FAKE_SANITY_PORT = 9999
export const SITE_URL = 'https://example.com'
export const REVALIDATE_SECRET = 'e2e-webhook-secret'
export const INDEXNOW_KEY = 'e2eindexnowkey1234'
/** Signs the A/B variant codes (the flags package); any 32 random bytes. */
export const FLAGS_SECRET = 'cHJpdmF0ZS1lMmUtZmxhZ3Mtc2VjcmV0LTMyLWJ5dGVz'
/** Content release the perspective test previews; Studio puts its id in the perspective cookie. */
export const RELEASE_ID = 'rSummer'

/**
 * Environment of the site under test, shared by Playwright and Lighthouse CI (scripts/e2e-server.mjs).
 * Webhook mode is on, so visitors open no live connection. NEXT_PUBLIC_* values are baked in at build.
 */
export const APP_ENV = {
  NEXT_PUBLIC_SANITY_PROJECT_ID: 'e2etest1',
  NEXT_PUBLIC_SANITY_DATASET: 'production',
  NEXT_PUBLIC_SITE_URL: SITE_URL,
  SANITY_API_READ_TOKEN: 'e2e-token',
  SANITY_API_HOST: `http://localhost:${FAKE_SANITY_PORT}`,
  SANITY_REVALIDATE_SECRET: REVALIDATE_SECRET,
  INDEXNOW_KEY,
  FLAGS_SECRET,
  // The proxy re-reads the running experiment every second, so the A/B tests don't wait a minute.
  EXPERIMENT_CACHE_SECONDS: '1',
  // Forms: Turnstile and Resend are replaced by mocks (the real services are never called).
  FORMS_TEST_MODE: '1',
}
