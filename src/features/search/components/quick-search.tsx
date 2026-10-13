'use client'

import Link from 'next/link'
import { lazy, Suspense, useEffect, useState } from 'react'

import { SEARCH_PATH } from '@/config/paths'

const loadDialog = () =>
  import('./quick-search-dialog').then((m) => ({ default: m.QuickSearchDialog }))
const QuickSearchDialog = lazy(loadDialog)

/**
 * The header's search link and the Ctrl/Cmd+K shortcut. Both open a modal dialog whose code is
 * only downloaded when it is first wanted (on hover, focus, the shortcut or a click), so every
 * page carries just this small trigger. It is a real link to /search: with JavaScript off, or
 * for a middle click, it goes to the results page instead.
 */
export function QuickSearch({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <>
      <Link
        href={SEARCH_PATH}
        prefetch={false}
        aria-keyshortcuts="Control+K Meta+K"
        aria-haspopup="dialog"
        className={`flex size-10 items-center justify-center rounded-md hover:bg-gray-100 ${className}`}
        onPointerEnter={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        onClick={(event) => {
          // Let "open in new tab" and friends reach the results page.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          setOpen(true)
        }}
      >
        <span className="sr-only">Search</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </Link>
      {open && (
        <Suspense fallback={null}>
          <QuickSearchDialog
            onClose={() => {
              setOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
