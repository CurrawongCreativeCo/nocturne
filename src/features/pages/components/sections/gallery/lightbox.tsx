'use client'

import type { PanInfo } from 'motion/react'
import * as m from 'motion/react-m'
import { useCallback, useRef, useState, type KeyboardEvent } from 'react'

import { useModalDialog } from '@/components/ui/overlay/use-modal-dialog'
import { SanityImage } from '@/components/ui/sanity-image'
import { Slider, type SliderHandle } from '@/components/ui/slider'
import { shouldDismiss } from '@/components/ui/swipe-dismiss'

import type { GalleryImage } from './shared'

/** Widest picture asked of the image CDN (px). Never more than the original has. */
const FULL_WIDTH = 2400

interface Props {
  images: GalleryImage[]
  /** Names the dialog and its slider. */
  label: string
  /** The picture to open on. */
  initialIndex: number
  onClose: () => void
}

/**
 * A full-screen picture viewer in a native modal <dialog>: the browser traps focus, makes the page
 * behind it inert, closes on Escape and returns focus to what opened it. The pictures sit in the
 * shared Slider (buttons, arrow keys, drag); dragging down closes it, using the same
 * `shouldDismiss` as any other swiped-away panel. Only the current picture and its neighbours are
 * downloaded. Loaded on first use (lightbox-provider.tsx).
 */
export function Lightbox({ images, label, initialIndex, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<SliderHandle>(null)
  const [current, setCurrent] = useState(initialIndex)

  // Mounted open: the hook shows it and calls `onClose` however it closes.
  useModalDialog(dialogRef, true, onClose)

  // The slider moves itself when focus is inside it; this is for the rest (the Close button, the dialog).
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return
    if (event.key === 'ArrowLeft') sliderRef.current?.previous()
    else if (event.key === 'ArrowRight') sliderRef.current?.next()
    else return
    event.preventDefault()
  }

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const size = panelRef.current?.offsetHeight ?? 0
    if (shouldDismiss({ offset: info.offset.y, velocity: info.velocity.y, size })) {
      dialogRef.current?.close()
    }
  }

  const onIndexChange = useCallback((index: number) => {
    setCurrent(index)
  }, [])

  return (
    // The dialog is the widget; its handlers only add the arrow keys to what <dialog> already does.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label={`${label}: image viewer`}
      onKeyDown={onKeyDown}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden overscroll-contain bg-surface p-0 text-ink"
    >
      <m.div
        ref={panelRef}
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragMomentum={false}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        className="flex h-dvh flex-col px-4 pb-4 sm:px-8"
      >
        <div className="flex min-h-16 items-center justify-between gap-4">
          <p className="text-small font-medium text-ink-muted">
            {current + 1} of {images.length}
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-pill px-5 text-small font-medium text-ink ring-1 ring-line-strong hover:bg-surface-alt"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <Slider
            ref={sliderRef}
            label={`${label} (full size)`}
            initialIndex={initialIndex}
            onIndexChange={onIndexChange}
            dots={false}
            directionLock
          >
            {images.map((image, i) => (
              <LightboxSlide key={image._key} image={image} near={Math.abs(i - current) <= 1} />
            ))}
          </Slider>
        </div>
      </m.div>
    </dialog>
  )
}

/** One picture and its caption. Pictures further than one slide away stay empty until they are close. */
function LightboxSlide({ image, near }: { image: GalleryImage; near: boolean }) {
  const width = Math.min(FULL_WIDTH, image.asset?.metadata?.dimensions?.width ?? FULL_WIDTH)

  return (
    <figure className="flex w-full flex-col items-center justify-center gap-3">
      {near ? (
        <SanityImage
          image={image}
          width={width}
          sizes="100vw"
          loading="eager"
          className="h-auto max-h-[calc(100dvh-17rem)] w-auto max-w-full object-contain"
        />
      ) : (
        <div aria-hidden="true" className="h-[40dvh] w-full" />
      )}
      <figcaption className="min-h-6 max-w-measure text-center text-body text-pretty text-ink-muted">
        {image.caption}
      </figcaption>
    </figure>
  )
}
