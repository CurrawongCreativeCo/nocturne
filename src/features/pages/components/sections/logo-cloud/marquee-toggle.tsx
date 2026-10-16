'use client'

import { useRef, useState } from 'react'

/**
 * The Pause / Play button WCAG 2.2.2 asks for (moving content that starts on its own and lasts over
 * five seconds must be stoppable). It is the marquee's only JavaScript: it sets `data-paused` on the
 * marquee, and the stylesheet pauses the animation. Hidden by CSS under reduced motion and without
 * JavaScript, when nothing moves.
 */
export function MarqueeToggle() {
  const button = useRef<HTMLButtonElement>(null)
  const [paused, setPaused] = useState(false)

  return (
    <button
      ref={button}
      type="button"
      aria-label={paused ? 'Play logo scrolling' : 'Pause logo scrolling'}
      onClick={() => {
        const next = !paused
        button.current?.closest('[data-marquee]')?.toggleAttribute('data-paused', next)
        setPaused(next)
      }}
      className="inline-flex items-center gap-2 rounded-button border border-line-strong px-4 py-2 text-small font-semibold text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        {paused ? (
          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.43-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
        ) : (
          <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        )}
      </svg>
      {paused ? 'Play' : 'Pause'}
    </button>
  )
}
