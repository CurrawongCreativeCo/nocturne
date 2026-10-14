'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Mobile navigation as a native <details> disclosure (works before JavaScript loads), plus the
 * closing behavior <details> lacks: the header persists across navigations, so without this the
 * menu would stay open over the next page.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()

  // Back/forward navigation while open.
  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  useEffect(() => {
    const details = ref.current
    if (!details) return

    const onClick = (event: MouseEvent) => {
      // Any link, including one to the current page.
      if ((event.target as Element).closest('a')) details.open = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return
      details.open = false
      details.querySelector('summary')?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) details.open = false
    }

    details.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      details.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return (
    <details ref={ref} className="group md:hidden">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-control hover:bg-surface-alt [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Menu</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
          <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </summary>
      <nav
        aria-label="Mobile"
        className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-line bg-surface px-gutter py-4 shadow-raised"
      >
        {children}
      </nav>
    </details>
  )
}
