'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

import { gaId, plausibleDomain, posthogHost, posthogKey } from '@/config/analytics'
import { useConsentState } from '@/lib/consent/consent-store'

import { gaInlineScript, posthogScriptUrl } from '../utils/analytics-snippets'
import { clearAnalyticsStorage } from '../utils/clear-analytics-storage'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    posthog?: { init: (token: string, options: Record<string, unknown>) => void }
  }
}

/**
 * Loads the analytics providers configured by environment variable, and only once the visitor has
 * accepted analytics: until then no provider script is in the page and no request goes to it.
 * Withdrawing consent clears what they stored and reloads, because a loaded script can't be unloaded.
 */
export function AnalyticsScripts() {
  const state = useConsentState()
  const analytics = state?.consent?.analytics ?? false
  const marketing = state?.consent?.marketing ?? false
  const decided = state?.consent != null
  const wasLoaded = useRef(false)

  useEffect(() => {
    if (analytics) {
      wasLoaded.current = true
      // Marketing changed after Google loaded; the first grant is covered by the inline script.
      const ads = marketing ? 'granted' : 'denied'
      window.gtag?.('consent', 'update', {
        ad_storage: ads,
        ad_user_data: ads,
        ad_personalization: ads,
      })
    } else if (decided) {
      window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
      clearAnalyticsStorage()
      if (wasLoaded.current) window.location.reload()
    }
  }, [analytics, marketing, decided])

  if (!analytics) return null
  const token = posthogKey

  return (
    <>
      {plausibleDomain && (
        <Script
          id="plausible"
          src="https://plausible.io/js/script.js"
          data-domain={plausibleDomain}
          defer
        />
      )}
      {token && (
        <Script
          id="posthog"
          src={posthogScriptUrl(posthogHost)}
          onLoad={() => {
            window.posthog?.init(token, { api_host: posthogHost, defaults: '2026-05-30' })
          }}
        />
      )}
      {gaId && (
        <>
          {/* Consent Mode defaults go on the data layer first; gtag.js reads them when it arrives. */}
          <Script
            id="ga-consent"
            dangerouslySetInnerHTML={{ __html: gaInlineScript(gaId, { marketing }) }}
          />
          <Script
            id="ga"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
          />
        </>
      )}
    </>
  )
}
