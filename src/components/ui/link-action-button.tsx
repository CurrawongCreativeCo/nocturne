import type { ReactNode } from 'react'

import type { OverlayKind } from '@/config/link-actions'

/**
 * A panel or booking trigger: a real <button> that opens an overlay. It is plain server markup, so
 * it adds no JavaScript to the page. The overlay (task 93/95) listens for clicks on
 * `[data-overlay-kind]` and calls `preventDefault()` to open its dialog (see config/link-actions.ts).
 * With a fallback URL the button submits a GET form, so without JavaScript, or if no overlay
 * claims the click, it goes there. Without one it does nothing until the overlay takes over.
 */
export function LinkActionButton({
  kind,
  id = '',
  fallbackHref,
  title,
  className,
  children,
}: {
  kind: OverlayKind
  /** The panel document's id; empty for booking. */
  id?: string
  fallbackHref?: string
  /** The dialog's title; added to the accessible name so the button says what it opens. */
  title?: string
  className?: string
  children: ReactNode
}) {
  const button = (
    <button
      type={fallbackHref ? 'submit' : 'button'}
      aria-haspopup="dialog"
      data-overlay-kind={kind}
      data-overlay-id={id}
      className={className}
    >
      {children}
      {title && <span className="sr-only"> (opens {title})</span>}
    </button>
  )

  return fallbackHref ? (
    <form action={fallbackHref} method="get" className="contents">
      {button}
    </form>
  ) : (
    button
  )
}
