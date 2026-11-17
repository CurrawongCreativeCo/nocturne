'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** Hovering this long opens the dropdown, so passing the pointer across the header doesn't. */
export const HOVER_OPEN_DELAY = 150
/** Leaving for this long closes a hover-opened dropdown; a moment to cross the gap to the panel. */
export const HOVER_CLOSE_DELAY = 300
/** The dropdown keeps this far from the window's edges. */
const EDGE = 16

/**
 * A header menu link with a dropdown of sub-links: a disclosure (a button with `aria-expanded`
 * showing a plain list of links), not an ARIA menu. When the entry has its own page, `link` is
 * shown beside the button so the page stays one click away; without one, the label is the button.
 *
 * Opens on click, Enter and Space (the button's own behavior), or after a short hover; closes on
 * Escape (focus returns to the button), a click outside, focus leaving it, or following a link.
 * Before JavaScript loads, hover and focus show the panel through CSS (`:not([data-js])`).
 */
export function NavDropdown({
  label,
  link,
  children,
}: {
  label: string
  link?: ReactNode
  /** The `<li>` items of the list. */
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  // Opened by a click: stays open when the pointer leaves, until a click outside or Escape.
  const pinned = useRef(false)

  const cancel = () => {
    window.clearTimeout(timer.current)
  }
  const close = useCallback(() => {
    window.clearTimeout(timer.current)
    pinned.current = false
    setOpen(false)
  }, [])

  // Hover, focus leaving and link clicks, on the wrapper (as in MobileMenu; the button and links
  // are the interactive elements).
  useEffect(() => {
    const element = root.current
    if (!element) return
    element.setAttribute('data-js', '')

    const schedule = (next: boolean, delay: number) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (next || !element.contains(document.activeElement)) setOpen(next)
      }, delay)
    }
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') schedule(true, HOVER_OPEN_DELAY)
    }
    // Keyboard focus inside keeps a hover-opened dropdown open; focus leaving closes it (focusout).
    const hasFocus = () => element.contains(document.activeElement)
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (pinned.current || hasFocus()) window.clearTimeout(timer.current)
      else schedule(false, HOVER_CLOSE_DELAY)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) close()
    }
    const onClick = (event: MouseEvent) => {
      // Following a link (a sub-link or the parent's own): the header stays mounted across
      // navigations, so close it here. The toggle button handles its own clicks.
      const target = (event.target as Element).closest('a, button')
      if (target && target !== button.current) close()
    }

    element.addEventListener('pointerenter', onPointerEnter)
    element.addEventListener('pointerleave', onPointerLeave)
    element.addEventListener('focusout', onFocusOut)
    element.addEventListener('click', onClick)
    return () => {
      window.clearTimeout(timer.current)
      element.removeEventListener('pointerenter', onPointerEnter)
      element.removeEventListener('pointerleave', onPointerLeave)
      element.removeEventListener('focusout', onFocusOut)
      element.removeEventListener('click', onClick)
    }
  }, [close])

  // Keeps the panel inside the window: shifts it left by however much it would overflow.
  useLayoutEffect(() => {
    const element = panel.current
    if (!open || !element) return
    const fit = () => {
      element.style.translate = ''
      const { left, right } = element.getBoundingClientRect()
      const overflow = right - (document.documentElement.clientWidth - EDGE)
      if (overflow > 0) element.style.translate = `${-Math.min(overflow, left - EDGE)}px 0`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const hadFocus = root.current?.contains(document.activeElement)
      close()
      if (hadFocus) button.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, close])

  const chevron = (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4 group-data-open/nav:rotate-180 motion-safe:transition-transform"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )

  return (
    <div
      ref={root}
      data-open={open || undefined}
      className="group/nav relative flex items-center gap-0.5"
    >
      {link}
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={link ? `${label} submenu` : undefined}
        className={`flex items-center gap-1 rounded-control text-small font-medium text-ink-muted group-data-open/nav:text-ink hover:text-ink ${link ? 'p-1' : 'py-1'}`}
        onClick={() => {
          cancel()
          // A click on a dropdown the hover already opened keeps it open, rather than closing it.
          const next = !(open && pinned.current)
          pinned.current = next
          setOpen(next)
        }}
      >
        {!link && label}
        {chevron}
      </button>
      <div
        ref={panel}
        id={id}
        className="absolute top-full left-0 z-50 hidden w-max max-w-[min(18rem,calc(100vw-2rem))] min-w-48 pt-2 group-data-open/nav:block group-[:not([data-js]):focus-within]/nav:block group-[:not([data-js]):hover]/nav:block"
      >
        <ul className="flex flex-col gap-0.5 rounded-control border border-line bg-surface p-2 shadow-raised">
          {children}
        </ul>
      </div>
    </div>
  )
}
