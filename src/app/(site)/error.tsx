'use client'

import Link from 'next/link'
import { useEffect } from 'react'

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
  }, [error])

  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="text-4xl font-semibold">Something went wrong</h1>
      <p className="mt-4 text-gray-600">
        This page couldn&apos;t be loaded. Please try again in a moment.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full px-6 py-3 text-sm font-semibold ring-1 ring-gray-300 ring-inset hover:bg-gray-100"
        >
          Go home
        </Link>
      </div>
    </section>
  )
}
