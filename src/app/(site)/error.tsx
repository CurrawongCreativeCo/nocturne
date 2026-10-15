'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { reportClientError } from '@/lib/sentry/client'

/**
 * Shown when a page fails to render (e.g. Sanity is unreachable). The site layout,
 * including the header and footer, stays in place around it.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    reportClientError(error)
  }, [error])

  return (
    <section className="mx-auto max-w-xl px-gutter py-section-spacious text-center">
      <h1 className="text-h1 font-semibold">Something went wrong</h1>
      <p className="mt-4 text-ink-muted">
        This page couldn&apos;t be loaded. Please try again in a moment.
      </p>
      {error.digest && (
        // Matches the "digest" in the server logs (src/instrumentation.ts).
        <p className="mt-2 text-small text-ink-muted">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-button bg-cta px-6 py-3 text-small font-semibold text-cta-ink hover:bg-cta/85"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-button px-6 py-3 text-small font-semibold ring-1 ring-line ring-inset hover:bg-surface-alt"
        >
          Go home
        </Link>
      </div>
    </section>
  )
}
