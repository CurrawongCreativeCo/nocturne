'use client'

import dynamic from 'next/dynamic'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { GalleryImage } from './shared'

// The lightbox (its dialog, Slider and Motion's spring) is downloaded the first time a picture is
// opened, so a gallery adds only this file to the page's JavaScript. `ssr: false` must sit in a
// client component; there is nothing to render on the server anyway, as it starts closed.
const Lightbox = dynamic(() => import('./lightbox').then((mod) => mod.Lightbox), { ssr: false })

const OpenContext = createContext<((index: number, opener: HTMLElement) => void) | null>(null)

/**
 * Wraps a gallery's pictures (server-rendered, passed as children) and owns the lightbox: which
 * picture is open and which button opened it, so focus can go back there. See README, "Gallery".
 */
export function LightboxProvider({
  images,
  label,
  children,
}: {
  images: GalleryImage[]
  label: string
  children: ReactNode
}) {
  const [openAt, setOpenAt] = useState<number | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const open = useCallback((index: number, opener: HTMLElement) => {
    openerRef.current = opener
    setOpenAt(index)
  }, [])

  const close = useCallback(() => {
    setOpenAt(null)
    // The dialog hands focus back itself, but Safari doesn't focus a button on click, so say it.
    openerRef.current?.focus()
    openerRef.current = null
  }, [])

  return (
    <OpenContext value={open}>
      {children}
      {openAt !== null && (
        <Lightbox images={images} label={label} initialIndex={openAt} onClose={close} />
      )}
    </OpenContext>
  )
}

/** A picture's button. It can only sit inside a LightboxProvider. */
export function OpenImageButton({
  index,
  label,
  className,
  children,
}: {
  index: number
  label: string
  className: string
  children: ReactNode
}) {
  const open = useContext(OpenContext)
  const onClick = useMemo(
    () => (event: React.MouseEvent<HTMLButtonElement>) => {
      open?.(index, event.currentTarget)
    },
    [open, index],
  )

  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
