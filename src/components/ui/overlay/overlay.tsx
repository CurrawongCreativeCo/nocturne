'use client'

import { type PanInfo, useDragControls, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from 'react'

import { motion as motionTokens } from '@/config/tokens.generated'

import { swipeDirection, type OverlayPresentation, type OverlayWidth } from './presentation'
import { useModalDialog } from './use-modal-dialog'
import { shouldDismiss } from '../swipe-dismiss'

interface Props {
  open: boolean
  /** Runs once the dialog has closed, however it closed (Escape, Close, backdrop, swipe). */
  onClose: () => void
  presentation: OverlayPresentation
  /** The dialog's accessible name, shown as its heading. Focus moves to it on opening. */
  title: string
  width?: OverlayWidth
  /** Whether a swipe closes drawers and sheets. A swipe is only ever an extra: Close always works. */
  swipe?: boolean
  children: ReactNode
}

/** The dialog covers the viewport, so a click beside the panel lands on it; this places the panel. */
const FRAME: Record<OverlayPresentation, string> = {
  modal: 'items-center justify-center p-4',
  'drawer-right': 'items-stretch justify-end',
  'drawer-left': 'items-stretch justify-start',
  sheet: 'items-end justify-center',
  fullscreen: 'items-stretch justify-stretch',
}

/** The panel's box (the part that travels in), before any width limit. */
const BOX: Record<OverlayPresentation, string> = {
  modal: 'max-h-[calc(100dvh-2rem)] w-full',
  'drawer-right': 'h-full w-full',
  'drawer-left': 'h-full w-full',
  sheet: 'max-h-[92dvh] w-full',
  fullscreen: 'h-full w-full',
}

const ROUNDING: Record<OverlayPresentation, string> = {
  modal: 'rounded-card',
  'drawer-right': '',
  'drawer-left': '',
  sheet: 'rounded-t-card',
  fullscreen: '',
}

/** The widest the box grows. Sheets and full screen ignore the choice. */
const MAX_WIDTH: Record<OverlayPresentation, Record<OverlayWidth, string> | null> = {
  modal: { narrow: 'max-w-sm', medium: 'max-w-xl', wide: 'max-w-4xl' },
  'drawer-right': { narrow: 'max-w-xs', medium: 'max-w-md', wide: 'max-w-2xl' },
  'drawer-left': { narrow: 'max-w-xs', medium: 'max-w-md', wide: 'max-w-2xl' },
  sheet: null,
  fullscreen: null,
}

const SHOWN = { opacity: 1, x: 0, y: 0 }

/** Where the box comes from on opening. Reduced motion: it simply appears, with nothing to animate. */
function hiddenState(presentation: OverlayPresentation, reduced: boolean) {
  if (reduced) return SHOWN
  switch (presentation) {
    case 'drawer-right':
      return { opacity: 1, x: '100%' }
    case 'drawer-left':
      return { opacity: 1, x: '-100%' }
    case 'sheet':
      return { opacity: 1, y: '100%' }
    default:
      return { opacity: 0, y: motionTokens.revealDistance / 2 }
  }
}

/** A press inside these is typing, selecting or clicking, not the start of a swipe. */
const NO_SWIPE = 'input, textarea, select, button, a, [contenteditable], [data-no-swipe]'

/**
 * The site's one overlay: a native modal <dialog> shown as a centred window, a side drawer, a
 * bottom sheet or full screen. Its heading names it and takes focus on opening; the browser makes
 * the page behind inert and closes on Escape, and `useModalDialog` adds the scroll lock and gives
 * focus back. The entrance uses the motion tokens; under reduced motion it simply appears. Swiping away is
 * an extra for touch: from anywhere on a drawer, and from the top bar of a sheet so a long sheet
 * still scrolls. Close, Escape and a click on the backdrop always work.
 *
 * Render it in every state: closed it is a hidden <dialog>, so server-rendered content inside is in
 * the page but not shown, and heavy children can wait until `open` has first been true.
 */
export function Overlay({
  open,
  onClose,
  presentation,
  title,
  width = 'medium',
  swipe = true,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const reduced = useReducedMotion() ?? false
  const controls = useDragControls()
  // A press that starts inside the panel (selecting text) and ends on the backdrop is not a click on it.
  const pressedBackdrop = useRef(false)

  useModalDialog(dialogRef, open, onClose)

  // After the hook has shown the dialog (its effect runs first). The name, so a screen reader starts
  // by saying where you are; the first control is one Tab away.
  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true })
  }, [open])

  const direction = swipe ? swipeDirection(presentation) : null

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!direction || event.pointerType === 'mouse') return
    const target = event.target as Element
    if (target.closest(NO_SWIPE)) return
    if (direction === 'down' && !target.closest('[data-overlay-drag]')) return
    controls.start(event)
  }

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const box = boxRef.current
    if (!box || !direction) return
    const along = direction === 'down' ? 'y' : 'x'
    const toward = direction === 'left' ? -1 : 1
    const size = direction === 'down' ? box.offsetHeight : box.offsetWidth
    const dismiss = shouldDismiss({
      offset: info.offset[along] * toward,
      velocity: info.velocity[along] * toward,
      size,
    })
    if (dismiss) dialogRef.current?.close()
  }

  const hidden = hiddenState(presentation, reduced)

  return (
    // A click beside the panel lands on the dialog itself and closes it. That is a pointer
    // shortcut: keyboard users have Escape and the Close button, so no key handler is needed.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-presentation={presentation}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) {
          event.currentTarget.close()
        }
      }}
      className={`fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden overscroll-contain border-0 bg-transparent p-0 text-ink backdrop:bg-surface-inverse/50 open:flex ${FRAME[presentation]}`}
    >
      <m.div
        initial={hidden}
        animate={open ? SHOWN : hidden}
        transition={{ duration: motionTokens.duration, ease: motionTokens.easeOut }}
        className={`flex ${BOX[presentation]} ${MAX_WIDTH[presentation]?.[width] ?? ''}`}
      >
        <m.div
          ref={boxRef}
          drag={direction === null ? false : direction === 'down' ? 'y' : 'x'}
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={{
            top: 0,
            bottom: direction === 'down' ? 0.5 : 0,
            left: direction === 'left' ? 0.5 : 0,
            right: direction === 'right' ? 0.5 : 0,
          }}
          dragMomentum={false}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
          onPointerDown={onPointerDown}
          className={`flex min-h-0 w-full flex-col overflow-hidden bg-surface shadow-raised ${ROUNDING[presentation]} ${
            direction === 'right' || direction === 'left' ? 'touch-pan-y' : ''
          }`}
        >
          <div
            data-overlay-drag=""
            className={`flex shrink-0 flex-col ${direction === 'down' ? 'touch-none' : ''}`}
          >
            {direction === 'down' && (
              <span
                aria-hidden="true"
                className="mx-auto mt-2 h-1.5 w-10 rounded-pill bg-line-strong"
              />
            )}
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
              <h2
                ref={headingRef}
                id={titleId}
                tabIndex={-1}
                className="text-h3 font-semibold text-balance"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="-mt-1 -mr-2 min-h-11 shrink-0 rounded-control px-4 text-small font-medium text-ink-muted hover:bg-surface-alt hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
          {/* Focusable so a keyboard user can scroll long content with the arrow keys (WCAG 2.1.1). */}
          <div
            role="region"
            aria-labelledby={titleId}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6"
          >
            {children}
          </div>
        </m.div>
      </m.div>
    </dialog>
  )
}
