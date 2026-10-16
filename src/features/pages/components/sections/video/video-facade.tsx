'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** The player's address (see `embedUrl`): not requested until the visitor presses Play. */
  src: string
  title: string
  /** "YouTube" or "Vimeo", for the note under the button. */
  provider: string
  /** The poster, rendered on the server. */
  children: ReactNode
}

/**
 * A poster and a Play button standing in for a third-party player. The iframe (and so every request
 * to YouTube or Vimeo) exists only after the click; until then the page loads one image. The button
 * disappears when the iframe arrives, so focus moves to the player: keyboard and screen-reader users
 * land where the video is. Fills a relatively positioned frame.
 */
export function VideoFacade({ src, title, provider, children }: Props) {
  const [playing, setPlaying] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const noteId = useId()

  useEffect(() => {
    if (playing) frame.current?.focus()
  }, [playing])

  if (playing) {
    return (
      <iframe
        ref={frame}
        src={src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    )
  }

  return (
    <>
      {children}
      <button
        type="button"
        aria-label={`Play video: ${title}`}
        aria-describedby={noteId}
        onClick={() => {
          setPlaying(true)
        }}
        // The surface band keeps the focus ring visible on any poster; the frame clips an outside ring.
        className="group absolute inset-0 flex items-center justify-center focus-visible:shadow-[inset_0_0_0_6px_var(--color-surface)] focus-visible:outline-offset-[-6px]"
      >
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-ink text-surface shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        >
          <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor" focusable="false">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.43-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
          </svg>
        </span>
      </button>
      <span
        id={noteId}
        className="pointer-events-none absolute inset-x-0 top-[calc(50%+3rem)] mx-auto w-fit rounded-button bg-surface px-3 py-1 text-small text-ink"
      >
        Plays from {provider}
      </span>
    </>
  )
}
