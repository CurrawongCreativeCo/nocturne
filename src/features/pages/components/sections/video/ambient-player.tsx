'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

interface Props {
  src: string
  /** The poster picture, rendered on the server: all there is without JavaScript or under reduced motion. */
  children: ReactNode
  /** Classes for the group that dims the picture and video together (e.g. `opacity-40`). */
  className?: string
}

const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

/**
 * The silent looping video behind an Ambient section, with the Pause button WCAG 2.2.2 asks for
 * (moving content that starts on its own and lasts over five seconds must be stoppable). Visitors who
 * ask for reduced motion get the poster and no video: the file is never requested. The server snapshot
 * is "reduced", so the HTML (and hydration) is the poster alone; the video mounts afterwards.
 */
export function AmbientPlayer({ src, children, className = '' }: Props) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => true,
  )
  const video = useRef<HTMLVideoElement>(null)
  // Assume it is playing; the video's own events correct that (a browser can refuse to autoplay).
  const [playing, setPlaying] = useState(true)

  // autoPlay does the work; this catches a browser that refuses (low-power mode) so the button says Play.
  // Runs when the video mounts, not on every render: that would restart it each time it is paused.
  useEffect(() => {
    video.current?.play().catch(() => {
      setPlaying(false)
    })
  }, [reduced])

  return (
    <>
      <div className={`absolute inset-0 -z-10 ${className}`}>
        {children}
        {!reduced && (
          <video
            ref={video}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onPlay={() => {
              setPlaying(true)
            }}
            onPause={() => {
              setPlaying(false)
            }}
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>
      {!reduced && (
        <button
          type="button"
          aria-label={playing ? 'Pause background video' : 'Play background video'}
          onClick={() => {
            const node = video.current
            if (!node) return
            if (node.paused) node.play().catch(() => undefined)
            else node.pause()
          }}
          className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-2 rounded-button bg-ink px-4 py-2 text-small font-semibold text-surface"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            {playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            ) : (
              <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.43-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
            )}
          </svg>
          {playing ? 'Pause' : 'Play'}
        </button>
      )}
    </>
  )
}
