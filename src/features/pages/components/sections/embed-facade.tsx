'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { reopenConsent, useConsentState } from '@/lib/consent/consent-store'

interface Props {
  /** The provider's iframe address, rebuilt from the validated address (see `resolveEmbed`). Not requested until the click. */
  src: string
  /** The provider's own page for the same thing: always offered, and the only way in without JavaScript. */
  openUrl: string
  /** Names the frame for screen readers. */
  title: string
  provider: string
  /** The narrowest `sandbox` the provider works with, space separated. */
  sandbox: string
  allow: string
  height: number
  /** The provider needs the marketing consent category before it loads. */
  needsMarketing: boolean
  /** Visitor-facing copy from `embedNotes`. */
  notes: { button: string; note: string; consent: string; open: string }
}

/**
 * A card standing in for a third-party embed. The iframe (and so every request and cookie of the
 * provider) exists only after the click; until then the page loads nothing from it. A provider that
 * needs marketing consent isn't loaded while that category is off: the card says so and offers the
 * cookie settings and a link to the provider instead. The card and the iframe share one height, so
 * nothing moves when it loads. The button disappears when the iframe arrives, so focus moves to the
 * frame. No listeners, observers or timers.
 */
export function EmbedFacade({
  src,
  openUrl,
  title,
  provider,
  sandbox,
  allow,
  height,
  needsMarketing,
  notes,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const consent = useConsentState()
  const frame = useRef<HTMLIFrameElement>(null)
  const noteId = useId()
  // The server and hydration can't know the choice (undefined), so until the browser has answered the card
  // shows the same thing as a visitor who hasn't allowed marketing: the page renders identically before and
  // after hydration for them, and no provider can load before consent is known.
  const known = consent !== undefined
  const blocked = needsMarketing && !consent?.consent?.marketing

  useEffect(() => {
    if (loaded && !blocked) frame.current?.focus()
  }, [loaded, blocked])

  if (loaded && !blocked) {
    return (
      <iframe
        ref={frame}
        src={src}
        title={title}
        loading="lazy"
        sandbox={sandbox}
        allow={allow || undefined}
        referrerPolicy="strict-origin-when-cross-origin"
        className="block w-full rounded-card border-0 ring-1 ring-line"
        style={{ height }}
      />
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-card bg-surface-alt p-6 text-center ring-1 ring-line"
      style={{ minHeight: height }}
    >
      <p className="text-small font-semibold text-ink">{provider}</p>
      <p id={noteId} className="max-w-measure-narrow text-small text-ink-muted">
        {blocked ? notes.consent : notes.note}
      </p>
      {blocked ? (
        <button
          type="button"
          aria-describedby={noteId}
          onClick={reopenConsent}
          className="inline-flex items-center justify-center rounded-button bg-ink px-4 py-2 text-small font-semibold text-surface"
        >
          Cookie settings
        </button>
      ) : (
        known && (
          <button
            type="button"
            aria-describedby={noteId}
            onClick={() => {
              setLoaded(true)
            }}
            className="inline-flex items-center justify-center rounded-button bg-ink px-4 py-2 text-small font-semibold text-surface"
          >
            {notes.button}
          </button>
        )
      )}
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-small text-ink underline"
      >
        {notes.open}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  )
}
