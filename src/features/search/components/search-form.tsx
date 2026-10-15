'use client'

import { useRouter } from 'next/navigation'
import { useTransition, type SubmitEvent } from 'react'

import { SEARCH_PATH } from '@/config/paths'

import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from '../utils/query'

/**
 * A plain GET form to /search, so searching works before (or without) JavaScript. Once hydrated it
 * swaps the full page load for a client navigation: the page keeps its place and focus, and the
 * results' live region updates in place, which is what screen readers announce.
 */
export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    const q = new FormData(event.currentTarget).get('q')
    if (typeof q !== 'string') return
    event.preventDefault()
    startTransition(() => {
      router.push(`${SEARCH_PATH}?${new URLSearchParams({ q })}`)
    })
  }

  return (
    <form
      role="search"
      action={SEARCH_PATH}
      method="get"
      onSubmit={onSubmit}
      aria-busy={pending}
      className="mt-8 flex max-w-xl gap-3"
    >
      <label htmlFor="search-page-input" className="sr-only">
        Search this site
      </label>
      <input
        id="search-page-input"
        type="search"
        name="q"
        defaultValue={defaultValue}
        minLength={MIN_QUERY_LENGTH}
        maxLength={MAX_QUERY_LENGTH}
        required
        autoComplete="off"
        placeholder="Search this site"
        className="min-w-0 flex-1 rounded-pill border border-line-strong px-5 py-3 text-body placeholder:text-ink-muted"
      />
      <button
        type="submit"
        className="rounded-button bg-surface-inverse px-6 py-3 text-small font-semibold text-ink-inverse hover:bg-surface-inverse/85"
      >
        Search
      </button>
    </form>
  )
}
