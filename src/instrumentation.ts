import type { Instrumentation } from 'next'

import { sentryDsn, sentryTracesSampleRate } from '@/lib/sentry/config'

/** Starts the Sentry SDK on the server. Only when SENTRY_DSN is set, so it is not even loaded otherwise. */
export async function register() {
  if (!sentryDsn) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.init({ dsn: sentryDsn, tracesSampleRate: sentryTracesSampleRate })
}

/**
 * Server-side error reporting. Next.js calls this for every error thrown while rendering a page,
 * running a route handler or a server action. One JSON line per error makes them searchable and
 * alertable in the host's logs (Vercel: project → Logs, filter "request-error").
 *
 * With SENTRY_DSN set, each error is also sent to Sentry, tagged with the same digest.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string }
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'request-error',
      message: err.message,
      // Matches the digest shown to visitors on the error page, to find a reported failure.
      digest: err.digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      revalidateReason: context.revalidateReason,
      stack: err.stack,
    }),
  )
  if (!sentryDsn) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err, {
      tags: {
        ...(err.digest && { digest: err.digest }),
        routePath: context.routePath,
        routeType: context.routeType,
      },
      extra: { method: request.method, path: request.path },
    })
    // Serverless functions can freeze right after the response; wait for the event to go out.
    await Sentry.flush(2000)
  } catch {
    // Error tracking must never break error handling; the JSON line above is already logged.
  }
}
