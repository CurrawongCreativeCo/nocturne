/**
 * What the forms need from the environment (README, "Forms"). Read on the server only: the
 * site key is public by design, everything else is a secret.
 */
export type FormsConfig =
  | {
      ready: true
      /** Skips Cloudflare and Resend entirely; see `isTestMode`. */
      testMode: true
    }
  | {
      ready: true
      testMode: false
      turnstileSiteKey: string
      turnstileSecretKey: string
      resendApiKey: string
      fromEmail: string
    }
  | { ready: false; missing: string[] }

type Env = Record<string, string | undefined>

/**
 * The end-to-end tests set FORMS_TEST_MODE=1 to replace Turnstile and Resend with mocks. A
 * production Vercel deployment ignores it, so the flag can't switch the spam check off by accident.
 */
export function isTestMode(env: Env = process.env) {
  return env.FORMS_TEST_MODE === '1' && env.VERCEL_ENV !== 'production'
}

export function getFormsConfig(env: Env = process.env): FormsConfig {
  if (isTestMode(env)) return { ready: true, testMode: true }

  // Literal `process.env.NEXT_PUBLIC_*` so Next.js can inline it; the others are read at runtime.
  const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileSecretKey = env.TURNSTILE_SECRET_KEY
  const resendApiKey = env.RESEND_API_KEY
  const fromEmail = env.FORMS_FROM_EMAIL

  const missing = [
    ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', turnstileSiteKey],
    ['TURNSTILE_SECRET_KEY', turnstileSecretKey],
    ['RESEND_API_KEY', resendApiKey],
    ['FORMS_FROM_EMAIL', fromEmail],
  ].flatMap(([name, value]) => (value ? [] : [name ?? '']))

  if (!turnstileSiteKey || !turnstileSecretKey || !resendApiKey || !fromEmail) {
    return { ready: false, missing }
  }
  return {
    ready: true,
    testMode: false,
    turnstileSiteKey,
    turnstileSecretKey,
    resendApiKey,
    fromEmail,
  }
}
