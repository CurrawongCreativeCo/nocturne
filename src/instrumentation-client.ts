import {
  NAVIGATION_START_EVENT,
  type NavigationStartDetail,
} from '@/components/ui/route-progress-state'
import { initClientSentry } from '@/lib/sentry/client'

// Optional error tracking; does nothing unless SENTRY_DSN is set (see README, "Error tracking").
initClientSentry()

/** Tells <RouteProgress> a client-side navigation started (README, "Navigation feedback"). */
export function onRouterTransitionStart(url: string) {
  window.dispatchEvent(
    new CustomEvent<NavigationStartDetail>(NAVIGATION_START_EVENT, { detail: { url } }),
  )
}
