/**
 * Analytics providers, chosen per project by environment variable. Each one loads only after the
 * visitor accepts analytics cookies (features/consent). All are public: they end up in the browser.
 * Reference each as a literal `process.env.NEXT_PUBLIC_*` so Next.js inlines it at build time.
 */

/** Plausible: your site's domain as registered in Plausible, e.g. `example.com`. */
export const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || undefined

/** PostHog project token (`phc_...`). */
export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined

/** PostHog ingestion host; the US cloud by default, `https://eu.i.posthog.com` for the EU cloud. */
export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

/** Google Analytics 4 measurement ID, e.g. `G-XXXXXXXXXX`. */
export const gaId = process.env.NEXT_PUBLIC_GA_ID || undefined

/** Without a provider there is nothing to ask consent for, so the banner stays out of the way. */
export const hasConsentProviders = Boolean(plausibleDomain ?? posthogKey ?? gaId)

/**
 * Whether any analytics provider is configured, read from the environment it is given. The
 * constants above are inlined at build time; this is for `config:check` and the setup status.
 */
export function getAnalyticsReadiness(env: Record<string, string | undefined>) {
  return env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || env.NEXT_PUBLIC_POSTHOG_KEY || env.NEXT_PUBLIC_GA_ID
    ? { ready: true as const }
    : {
        ready: false as const,
        missing: ['NEXT_PUBLIC_PLAUSIBLE_DOMAIN, NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_GA_ID'],
      }
}
