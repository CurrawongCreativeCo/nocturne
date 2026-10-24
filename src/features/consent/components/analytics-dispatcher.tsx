import { gaId, plausibleDomain, posthogKey } from '@/config/analytics'

import { analyticsDispatcherScript } from '../utils/analytics-dispatcher'

/** Defines `window.trackEvent` for the configured providers; see `analyticsDispatcherScript`. */
export function AnalyticsDispatcher() {
  const script = analyticsDispatcherScript({
    plausible: Boolean(plausibleDomain),
    posthog: Boolean(posthogKey),
    ga: Boolean(gaId),
  })
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
