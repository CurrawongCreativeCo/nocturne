'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

interface Props {
  /** The Google Maps embed URL. Nothing is requested from Google until the visitor clicks. */
  src: string
  /** Names the frame for screen readers, e.g. "Map of 1 King Street, Newtown". */
  title: string
  /** The static map (image or card), shown until the click and replaced by the interactive one. */
  children?: ReactNode
}

// Without JavaScript the button would do nothing, so it is only drawn once the page has hydrated.
const subscribe = () => () => undefined
const getHydrated = () => true
const getServerHydrated = () => false

/**
 * "Load interactive map": a privacy-first Google map. The page ships no Google iframe, script or
 * request; only a click swaps this component's static picture for the embed, and a note beside the
 * button says the map comes from Google. No listeners, observers or timers.
 */
export function MapEmbed({ src, title, children }: Props) {
  const [loaded, setLoaded] = useState(false)
  const hydrated = useSyncExternalStore(subscribe, getHydrated, getServerHydrated)
  const frame = useRef<HTMLIFrameElement>(null)

  // The button the visitor pressed disappears, so move focus to what replaced it.
  useEffect(() => {
    if (loaded) frame.current?.focus()
  }, [loaded])

  if (loaded) {
    return (
      <iframe
        ref={frame}
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="aspect-4/3 w-full rounded-card border-0 ring-1 ring-line"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {children}
      {/* Reserves the button's height so it doesn't push anything when it appears. */}
      <div className="flex min-h-[5.5rem] flex-col items-start gap-2 text-start">
        {hydrated && (
          <>
            <button
              type="button"
              onClick={() => {
                setLoaded(true)
              }}
              className="inline-flex items-center justify-center rounded-button px-4 py-2 text-small font-semibold text-ink ring-1 ring-line ring-inset hover:bg-surface-alt"
            >
              Load interactive map
            </button>
            <p className="max-w-measure-narrow text-small text-ink-muted">
              This map comes from Google. Loading it shares your visit with Google.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
