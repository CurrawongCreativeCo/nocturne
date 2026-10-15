'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { SEARCH_API_PATH, SEARCH_PATH } from '@/config/paths'

import type { SearchResult } from '../types/search-result'
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH, parseQuery } from '../utils/query'

const DEBOUNCE_MS = 250

/** The last finished request: which query it was for, and what came back (null = it failed). */
interface Outcome {
  q: string
  results: SearchResult[] | null
}

/**
 * Quick search in a native modal <dialog>: the browser traps focus, makes the page behind it inert,
 * closes on Escape and returns focus to what opened it. Typing queries /api/search after a
 * pause; the count and states are announced through a polite live region. Keyboard: type, then
 * Arrow Down / Tab into the results (Arrow Up returns to the box), Enter follows a result, or
 * Enter in the box opens the full results page.
 */
export function QuickSearchDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const parsed = parseQuery(query)
  const current = parsed.ok && outcome?.q === parsed.q ? outcome : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!dialog.open) dialog.showModal()
    // showModal() focuses the first control, which is Close; typing starts in the box.
    dialog.querySelector('input')?.focus()

    // A click on the backdrop lands on the dialog element itself; the content fills the rest.
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close()
    }
    // Arrow keys move through the box and the result links, like a listbox without the ARIA.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const stops = [...dialog.querySelectorAll<HTMLElement>('input[type="search"], ul a')]
      const at = stops.indexOf(document.activeElement as HTMLElement)
      const next = stops[event.key === 'ArrowDown' ? at + 1 : at - 1]
      if (!next) return
      event.preventDefault()
      next.focus()
    }
    dialog.addEventListener('click', onClick)
    dialog.addEventListener('keydown', onKeyDown)
    return () => {
      dialog.removeEventListener('click', onClick)
      dialog.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Debounced fetch. An older request is aborted when the text changes, so a slow answer to
  // "ab" can't replace the answer to "abc".
  const q = parsed.ok ? parsed.q : null
  useEffect(() => {
    if (q === null) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`${SEARCH_API_PATH}?${new URLSearchParams({ q })}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Search answered ${response.status}`)
          return response.json() as Promise<{ results: SearchResult[] }>
        })
        .then(({ results }) => {
          setOutcome({ q, results })
        })
        .catch(() => {
          if (!controller.signal.aborted) setOutcome({ q, results: null })
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  let status = ''
  if (!parsed.ok) {
    status =
      parsed.reason === 'short' ? `Type at least ${MIN_QUERY_LENGTH} characters to search.` : ''
  } else if (!current) {
    status = 'Searching…'
  } else if (!current.results) {
    status = 'Search is unavailable right now. Try again, or use the full search page.'
  } else if (current.results.length === 0) {
    status = `No pages found for “${current.q}”.`
  } else {
    status = `${current.results.length} ${current.results.length === 1 ? 'result' : 'results'} for “${current.q}”.`
  }

  const results = current?.results ?? []

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${inputId}-title`}
      onClose={onClose}
      className="mx-auto mt-[10vh] mb-auto max-h-[80vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-card bg-surface p-0 text-ink shadow-raised backdrop:bg-surface-inverse/50"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={`${inputId}-title`} className="text-lead font-semibold">
            Search
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-control px-3 py-1.5 text-small font-medium text-ink-muted hover:bg-surface-alt"
          >
            Close
          </button>
        </div>
        <form role="search" action={SEARCH_PATH} method="get" className="mt-4 flex gap-3">
          <label htmlFor={inputId} className="sr-only">
            Search this site
          </label>
          <input
            id={inputId}
            type="search"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="off"
            placeholder="Search this site"
            className="min-w-0 flex-1 rounded-pill border border-line-strong px-5 py-2.5 text-body placeholder:text-ink-muted"
          />
          <button
            type="submit"
            className="rounded-button bg-cta px-5 py-2.5 text-small font-semibold text-cta-ink hover:bg-cta/85"
          >
            All results
          </button>
        </form>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-4 min-h-6 text-small text-ink-muted"
        >
          {status}
        </p>
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-line">
            {results.map((result) => (
              <li key={result.path}>
                <Link
                  href={result.path}
                  onClick={() => dialogRef.current?.close()}
                  className="-mx-2 block rounded-control px-2 py-3 hover:bg-surface-alt"
                >
                  <span className="block font-semibold">{result.title}</span>
                  {result.snippet && (
                    <span className="mt-1 block text-small text-ink-muted">{result.snippet}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}
