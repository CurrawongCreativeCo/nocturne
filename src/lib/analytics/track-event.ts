import type { TrackProps } from './track-script'

declare global {
  interface Window {
    /** Defined by the site shell's analytics dispatcher (features/consent) when a provider is configured. */
    trackEvent?: (name: string, props?: TrackProps) => void
  }
}

/**
 * Sends a custom event from a client component. Does nothing without a configured provider and the
 * visitor's consent: the dispatcher decides, so callers need no consent logic. Kept apart from
 * `track-script.ts` so importing it adds only these few lines to the bundle, not the inline script.
 */
export function trackEvent(name: string, props?: TrackProps) {
  window.trackEvent?.(name, props)
}
