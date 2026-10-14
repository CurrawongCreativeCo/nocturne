'use client'

import '@/styles/globals.css'

import { useEffect } from 'react'

import { siteLanguage } from '@/config/env'
import { reportClientError } from '@/lib/sentry/client'

/**
 * Last-resort boundary for errors in the root or site layout (e.g. site settings failed to
 * load), where the header and footer can't render. Replaces the whole document.
 */
export default function GlobalError({
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
    <html lang={siteLanguage}>
      <body className="flex min-h-dvh items-center justify-center bg-surface font-body text-ink antialiased">
        <main className="max-w-xl px-gutter text-center">
          <h1 className="text-h1 font-semibold">Something went wrong</h1>
          <p className="mt-4 text-ink-muted">
            The site couldn&apos;t be loaded. Please try again in a moment.
          </p>
          {error.digest && (
            <p className="mt-2 text-small text-ink-muted">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-8 rounded-button bg-surface-inverse px-6 py-3 text-small font-semibold text-ink-inverse hover:bg-surface-inverse/85"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
