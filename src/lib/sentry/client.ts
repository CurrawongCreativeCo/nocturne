import type * as SentryModule from '@sentry/nextjs'

import { sentryDsn, sentryTracesSampleRate } from './config'

let sentry: Promise<typeof SentryModule> | undefined

/**
 * Loads and initializes the browser SDK once, in its own lazy chunk, so it never counts toward
 * the JavaScript the first page load needs. With no DSN the import is dead code and the chunk
 * isn't built at all.
 */
function loadSentry() {
  if (!sentryDsn) return undefined
  sentry ??= import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: sentryTracesSampleRate })
    return Sentry
  })
  return sentry
}

/** Starts loading the SDK so uncaught errors and traces are captured. Used by instrumentation-client.ts. */
export function initClientSentry() {
  loadSentry()?.catch(() => undefined)
}

/**
 * Sends an error caught by an error boundary. The digest is a tag, so searching `digest:<code>`
 * in Sentry finds the event for the "Reference" code shown to the visitor (the server's event for
 * the same failure carries the same tag).
 */
export function reportClientError(error: Error & { digest?: string }) {
  loadSentry()
    ?.then((Sentry) => {
      Sentry.captureException(error, { tags: error.digest ? { digest: error.digest } : undefined })
    })
    .catch(() => undefined)
}
