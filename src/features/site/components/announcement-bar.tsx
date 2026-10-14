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
 * Reveals the bar before the first paint, so showing it doesn't shift the page when React hydrates.
 * Same rules as `isInWindow` and `isDismissed` above; hydration then takes over.
 */
function revealScript(
  start: string | null | undefined,
  end: string | null | undefined,
  key: string,
  dismissible: boolean,
) {
  // `<` escaped so a message can't close the script tag.
  const args = JSON.stringify([start ?? null, end ?? null, storageKey(key), dismissible]).replace(
    /</g,
    '\\u003c',
  )
  return `(function(a){var n=Date.now(),s=a[0]?Date.parse(a[0]):NaN,e=a[1]?Date.parse(a[1]):NaN;if(n<s||n>=e)return;try{if(a[3]&&localStorage.getItem(a[2])==='1')return}catch(x){}document.currentScript.parentElement.hidden=false})(${args})`
}

/**
 * The announcement bar. Pages are cached, so the server can't know whether the bar is due:
 * it always renders the markup `hidden` (taking no space), and the browser reveals it once
 * the visitor's clock is inside the window and they haven't dismissed this message. An inline
 * script does that before first paint (React would only do it after hydration, shifting the
 * page); the state from useSyncExternalStore then agrees with it.
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
    <section
      aria-label="Announcement"
      hidden={!visible}
      // The script may have revealed it before hydration.
      suppressHydrationWarning
      className="bg-gray-950 text-white"
    >
      <script dangerouslySetInnerHTML={{ __html: revealScript(start, end, key, dismissible) }} />
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
