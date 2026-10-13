'use client'

import { stegaClean } from 'next-sanity'
import { useCallback, useSyncExternalStore, type ReactNode } from 'react'

import { isInWindow } from '../utils/announcement-window'

const storageKey = (message: string) => `announcement-dismissed:${message}`

// Dismissals made this session, so the bar still closes when localStorage is unavailable.
const dismissed = new Set<string>()
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function isDismissed(message: string) {
  if (dismissed.has(message)) return true
  try {
    return localStorage.getItem(storageKey(message)) === '1'
  } catch {
    return false
  }
}

function dismiss(message: string) {
  dismissed.add(message)
  try {
    localStorage.setItem(storageKey(message), '1')
  } catch {
    // Private mode or blocked storage: it stays closed until the page is reloaded.
  }
  listeners.forEach((notify) => {
    notify()
  })
}

/**
 * The announcement bar. Pages are cached, so the server can't know whether the bar is due:
 * it always renders the markup `hidden` (taking no space), and the browser reveals it once
 * the visitor's clock is inside the window and they haven't dismissed this message.
 * `children` is the message, already wrapped in its link when there is one.
 */
export function AnnouncementBar({
  message,
  startsAt,
  endsAt,
  dismissible,
  children,
}: {
  message: string
  startsAt?: string | null
  endsAt?: string | null
  dismissible: boolean
  children: ReactNode
}) {
  const key = stegaClean(message)
  const start = stegaClean(startsAt)
  const end = stegaClean(endsAt)

  const getSnapshot = useCallback(
    () => isInWindow(Date.now(), start, end) && !(dismissible && isDismissed(key)),
    [start, end, dismissible, key],
  )
  // The server snapshot is false, so hydration matches the hidden markup.
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false)

  return (
    <section aria-label="Announcement" hidden={!visible} className="bg-gray-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-2 text-center text-sm">
        <p>{children}</p>
        {dismissible && (
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => {
              dismiss(key)
            }}
            className="-my-1 -mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-white"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
