import type { Instrumentation } from 'next'

/**
 * Server-side error reporting. Next.js calls this for every error thrown while rendering a page,
 * running a route handler or a server action. One JSON line per error makes them searchable and
 * alertable in the host's logs (Vercel: project → Logs, filter "request-error").
 *
 * To send errors to Sentry or similar instead, forward them from here.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
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
}
