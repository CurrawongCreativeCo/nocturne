import { isTestMode } from '../config'

type Env = Record<string, string | undefined>

export const NEWSLETTER_PROVIDERS = ['resend', 'loops', 'mailchimp'] as const
export type NewsletterProviderName = (typeof NEWSLETTER_PROVIDERS)[number]

export type ProviderConfig =
  | { provider: 'resend'; apiKey: string; segmentId?: string }
  | { provider: 'loops'; apiKey: string; mailingListId?: string }
  | { provider: 'mailchimp'; apiKey: string; listId: string }

/**
 * What the newsletter signup needs from the environment (README, "Newsletter signup"). Turnstile is
 * shared with the forms; the provider is chosen by NEWSLETTER_PROVIDER. Test mode is the forms'
 * (`FORMS_TEST_MODE`): the spam check and the provider are both mocked.
 */
export type NewsletterConfig =
  | { ready: true; testMode: true }
  | {
      ready: true
      testMode: false
      turnstileSiteKey: string
      turnstileSecretKey: string
      provider: ProviderConfig
    }
  | { ready: false; missing: string[] }

const isProviderName = (value: string | undefined): value is NewsletterProviderName =>
  NEWSLETTER_PROVIDERS.some((name) => name === value)

export function getNewsletterConfig(env: Env = process.env): NewsletterConfig {
  if (isTestMode(env)) return { ready: true, testMode: true }

  // Literal `process.env.NEXT_PUBLIC_*` so Next.js can inline it; the others are read at runtime.
  const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileSecretKey = env.TURNSTILE_SECRET_KEY
  const name = env.NEWSLETTER_PROVIDER?.trim().toLowerCase()

  const missing: string[] = []
  if (!turnstileSiteKey) missing.push('NEXT_PUBLIC_TURNSTILE_SITE_KEY')
  if (!turnstileSecretKey) missing.push('TURNSTILE_SECRET_KEY')

  let provider: ProviderConfig | undefined
  if (!isProviderName(name)) {
    missing.push('NEWSLETTER_PROVIDER (resend, loops or mailchimp)')
  } else if (name === 'resend') {
    const apiKey = env.RESEND_API_KEY
    if (apiKey) provider = { provider: name, apiKey, segmentId: env.NEWSLETTER_RESEND_SEGMENT_ID }
    else missing.push('RESEND_API_KEY')
  } else if (name === 'loops') {
    const apiKey = env.LOOPS_API_KEY
    if (apiKey) provider = { provider: name, apiKey, mailingListId: env.LOOPS_MAILING_LIST_ID }
    else missing.push('LOOPS_API_KEY')
  } else {
    const apiKey = env.MAILCHIMP_API_KEY
    const listId = env.MAILCHIMP_LIST_ID
    if (!apiKey) missing.push('MAILCHIMP_API_KEY')
    if (!listId) missing.push('MAILCHIMP_LIST_ID')
    if (apiKey && listId) provider = { provider: name, apiKey, listId }
  }

  if (!turnstileSiteKey || !turnstileSecretKey || !provider) return { ready: false, missing }
  return { ready: true, testMode: false, turnstileSiteKey, turnstileSecretKey, provider }
}
