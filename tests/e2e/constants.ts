/** Shared by playwright.config.ts and the specs. */
export const APP_PORT = 3100
/** A second server on the same build with ENQUIRIES_STORE off; the main one has it on (enquiries.spec.ts). */
export const APP_PORT_ENQUIRIES_OFF = 3101
export const FAKE_SANITY_PORT = 9999
export const SITE_URL = 'https://example.com'
export const REVALIDATE_SECRET = 'e2e-webhook-secret'
export const INDEXNOW_KEY = 'e2eindexnowkey1234'
/** The stored consent of a visitor who rejected everything (see src/lib/consent/consent-state.ts). */
export const REJECTED_CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  analytics: false,
  marketing: false,
  savedAt: '2026-01-01T00:00:00.000Z',
})
/** Signs the A/B variant codes (the flags package); any 32 random bytes. */
export const FLAGS_SECRET = 'cHJpdmF0ZS1lMmUtZmxhZ3Mtc2VjcmV0LTMyLWJ5dGVz'
/** Members-only content: Auth.js signs sessions with this, and the test sign-in form checks the password. */
export const AUTH_SECRET = 'e2e-auth-secret-not-for-production-use'
export const MEMBER_EMAIL = 'member@example.com'
export const MEMBER_PASSWORD = 'e2e-member-password'
/** Not on the members list (AUTH_ALLOWED_EMAILS below), though the password is right. */
export const OUTSIDER_EMAIL = 'outsider@elsewhere.test'
export const STRIPE_WEBHOOK_SECRET = 'whsec_e2e_secret'
export const SANITY_WRITE_TOKEN = 'e2e-write-token'
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
  // Members-only content: sessions are signed with AUTH_SECRET; the password form is test-only.
  AUTH_SECRET,
  AUTH_TRUST_HOST: 'true',
  AUTH_TEST_MODE: '1',
  AUTH_TEST_PASSWORD: MEMBER_PASSWORD,
  AUTH_ALLOWED_EMAILS: '@example.com',
  // Pricing: the Stripe API is the fake one served by fake-sanity.mjs, and the webhook writes through
  // its mutate endpoint. Return URLs are set to check they are read (cancel would default to the
  // page the buyer came from).
  STRIPE_SECRET_KEY: 'sk_test_e2e',
  STRIPE_WEBHOOK_SECRET,
  SANITY_WRITE_TOKEN,
  STRIPE_API_HOST: `http://localhost:${FAKE_SANITY_PORT}/__stripe`,
  STRIPE_SUCCESS_URL: '/thanks?session_id={CHECKOUT_SESSION_ID}',
  STRIPE_CANCEL_URL: '/pricing',
  // Enquiries: stored when a form is sent. The fake Content Lake behaves like a private dataset, and
  // the write goes through its mutate endpoint (with SANITY_WRITE_TOKEN above).
  ENQUIRIES_STORE: '1',
  // Analytics providers: all three on, so the consent banner shows and the consent spec can watch each load.
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'example.com',
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e',
  NEXT_PUBLIC_GA_ID: 'G-E2ETEST',
}
