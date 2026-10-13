/**
 * What the pricing feature needs from the environment (README, "Pricing table"). Server-side only:
 * every value here is a secret or a server setting, so none has a NEXT_PUBLIC_ prefix.
 */

type Env = Record<string, string | undefined>

export type ConfigResult<T> = ({ ready: true } & T) | { ready: false; missing: string[] }

const DEFAULT_API_HOST = 'https://api.stripe.com'

/**
 * `STRIPE_API_HOST` points the REST calls at a fake Stripe in the end-to-end tests. A production
 * Vercel deployment ignores it, so a stray value can't send the secret key somewhere else.
 */
export function getApiHost(env: Env = process.env) {
  return env.STRIPE_API_HOST && env.VERCEL_ENV !== 'production'
    ? env.STRIPE_API_HOST.replace(/\/+$/, '')
    : DEFAULT_API_HOST
}

/**
 * Turns a configured return URL into an absolute one. A path ("/thanks") is resolved against the
 * site; a full http(s) URL is used as is. Stripe fills in `{CHECKOUT_SESSION_ID}`, so the text is
 * returned untouched rather than re-serialized (which would escape the braces). Null if unusable.
 */
export function resolveReturnUrl(value: string, siteUrl: string): string | null {
  if (value.startsWith('/')) {
    // "//host" is a protocol-relative URL, and "/\host" is read as one by browsers.
    return value.startsWith('//') || value.includes('\\') ? null : `${siteUrl}${value}`
  }
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:' ? value : null
  } catch {
    return null
  }
}

/** `value` if it is a URL on this site's origin, else null. Used for the page a buyer came from. */
export function sameSiteUrl(value: string | null, siteUrl: string): string | null {
  if (!value) return null
  try {
    return new URL(value).origin === new URL(siteUrl).origin ? value : null
  } catch {
    return null
  }
}

export interface CheckoutConfig {
  secretKey: string
  apiHost: string
  /** Where Stripe sends the buyer after paying. */
  successUrl: string
  /** Where Stripe sends the buyer who goes back; the page they came from when this is null. */
  cancelUrl: string | null
}

export function getCheckoutConfig(
  siteUrl: string,
  env: Env = process.env,
): ConfigResult<CheckoutConfig> {
  const secretKey = env.STRIPE_SECRET_KEY
  if (!secretKey) return { ready: false, missing: ['STRIPE_SECRET_KEY'] }

  const problems: string[] = []
  const resolve = (name: string, fallback: string | null) => {
    const value = env[name]?.trim()
    if (!value) return fallback
    const url = resolveReturnUrl(value, siteUrl)
    if (!url) problems.push(`${name} (use a path such as /thanks, or a full https:// URL)`)
    return url
  }
  const successUrl = resolve('STRIPE_SUCCESS_URL', `${siteUrl}/?checkout=success`)
  const cancelUrl = resolve('STRIPE_CANCEL_URL', null)
  if (problems.length > 0 || !successUrl) return { ready: false, missing: problems }

  return { ready: true, secretKey, apiHost: getApiHost(env), successUrl, cancelUrl }
}

export interface WebhookConfig {
  webhookSecret: string
  secretKey: string
  writeToken: string
  apiHost: string
}

export function getWebhookConfig(env: Env = process.env): ConfigResult<WebhookConfig> {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET
  const secretKey = env.STRIPE_SECRET_KEY
  const writeToken = env.SANITY_WRITE_TOKEN

  if (!webhookSecret || !secretKey || !writeToken) {
    return {
      ready: false,
      missing: [
        ['STRIPE_WEBHOOK_SECRET', webhookSecret],
        ['STRIPE_SECRET_KEY', secretKey],
        ['SANITY_WRITE_TOKEN', writeToken],
      ].flatMap(([name, value]) => (value ? [] : [name ?? ''])),
    }
  }
  return { ready: true, webhookSecret, secretKey, writeToken, apiHost: getApiHost(env) }
}
