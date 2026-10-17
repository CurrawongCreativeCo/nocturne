'use client'

import { useEffect, useRef, type RefObject } from 'react'

import { bindModalDialog, pageEnvironment } from './modal-dialog'

/**
 * Opens and closes a native <dialog> as a modal. While `open` is true the dialog is shown with
 * `showModal()` (focus trapped, page inert, Escape closes), the page behind can't scroll, and
 * focus goes back to what had it when the dialog closes. `onClose` runs once for every way it can
 * close, so the owner can set `open` back to false. A dialog that mounts open (quick search, the
 * lightbox) and one that stays mounted while closed (panels) both work. Everything is undone when
 * the component unmounts.
 */
export function useModalDialog(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  onClose?: () => void,
) {
  // The latest callback, without re-binding the dialog each render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const bindingRef = useRef<ReturnType<typeof bindModalDialog> | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const binding = bindModalDialog(dialog, pageEnvironment(), () => onCloseRef.current?.())
    bindingRef.current = binding
    return () => {
      binding.destroy()
      bindingRef.current = null
    }
  }, [ref])

  useEffect(() => {
    if (open) bindingRef.current?.show()
    else bindingRef.current?.hide()
  }, [open])
}
