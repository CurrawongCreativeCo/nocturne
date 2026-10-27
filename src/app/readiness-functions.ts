import { getAnalyticsReadiness } from '@/config/analytics'
import { getMembersReadiness } from '@/features/auth/utils/providers'
import { getExperimentsReadiness } from '@/features/experiments/utils/config'
import { getFormsConfig } from '@/features/forms/utils/config'
import { getEnquiryConfig } from '@/features/forms/utils/enquiry-config'
import { getNewsletterConfig } from '@/features/forms/utils/newsletter/config'
import { getCheckoutConfig, getWebhookConfig } from '@/features/pricing/utils/config'
import type { Env } from '@/lib/config/environment'
import type { Readiness } from '@/lib/config/evaluate'
import { getRedirectsReadiness } from '@/lib/edge-config-settings'
import { getIndexNowReadiness } from '@/lib/indexnow'
import { getPrelaunchReadiness } from '@/lib/preview-secret'
import { getRevalidateReadiness } from '@/lib/sanity/revalidate-config'
import { getStyleguideReadiness } from '@/lib/styleguide-access'

/**
 * The existing readiness functions a registry entry's `readiness` names, composed here because shared
 * code can't import features. Kept apart from `feature-registry.ts` on purpose: Studio imports the
 * registry (names and words), and nothing that reads settings should travel with it into the browser.
 * `config:check` and `getSetupStatus()` import this file; each function reads only the env it is given.
 */

/** A readiness function's answer in the shape the report reads. */
function toReadiness(result: { ready: boolean; missing?: readonly string[] }): Readiness {
  return result.ready ? { ready: true } : { ready: false, missing: result.missing ?? [] }
}

/** The existing functions a registry entry's `readiness` names. Each one reads the env it is given. */
export const readinessFunctions: Record<string, (env: Env) => Readiness> = {
  getFormsConfig: (env) => toReadiness(getFormsConfig(env)),
  getNewsletterConfig: (env) => toReadiness(getNewsletterConfig(env)),
  getEnquiryConfig: (env) => {
    const config = getEnquiryConfig(env)
    return config.enabled
      ? { ready: true }
      : { ready: false, missing: [config.missing ?? 'ENQUIRIES_STORE'] }
  },
  // Checkout and the payment webhook are two functions; the feature needs both.
  getPricingConfig: (env) => {
    const siteUrl = env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
    const checkout = toReadiness(getCheckoutConfig(siteUrl, env))
    const webhook = toReadiness(getWebhookConfig(env))
    const missing = [...new Set([...(checkout.missing ?? []), ...(webhook.missing ?? [])])]
    return missing.length > 0 ? { ready: false, missing } : { ready: true }
  },
  getMembersReadiness: (env) => toReadiness(getMembersReadiness(env)),
  getAnalyticsReadiness: (env) => toReadiness(getAnalyticsReadiness(env)),
  getExperimentsReadiness: (env) => toReadiness(getExperimentsReadiness(env)),
  getRevalidateReadiness: (env) => toReadiness(getRevalidateReadiness(env)),
  getIndexNowReadiness: (env) => toReadiness(getIndexNowReadiness(env)),
  getRedirectsReadiness: (env) => toReadiness(getRedirectsReadiness(env)),
  getPrelaunchReadiness: (env) => toReadiness(getPrelaunchReadiness(env)),
  getStyleguideReadiness: (env) => toReadiness(getStyleguideReadiness(env)),
}
