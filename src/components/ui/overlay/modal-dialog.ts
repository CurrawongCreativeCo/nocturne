import { createScrollLock } from './scroll-lock'

/** What bindModalDialog needs of a <dialog>; the real element satisfies it. */
export interface DialogLike {
  readonly open: boolean
  showModal: () => void
  close: () => void
  addEventListener: (type: 'close', listener: () => void) => void
  removeEventListener: (type: 'close', listener: () => void) => void
}

/** What it needs of the page, so the logic runs (and is tested) without a browser. */
export interface DialogEnvironment {
  activeElement: () => FocusTarget | null
  lockScroll: () => () => void
}

export interface FocusTarget {
  isConnected: boolean
  focus: () => void
}

export interface ModalDialogBinding {
  /** Opens the dialog as a modal: remembers the focused element and locks the page scroll. */
  show: () => void
  /** Closes it if it is open. */
  hide: () => void
  /** Ends the binding: closes the dialog, releases the lock and stops listening. */
  destroy: () => void
}

/**
 * The imperative half of `useModalDialog`. <dialog>.showModal() already traps focus, makes the page
 * inert and closes on Escape; this adds what the browser leaves out: the scroll lock, giving focus
 * back to whatever opened it (Safari doesn't always), and one `onClose` for every way it can close
 * (Escape, a Close button, `dialog.close()`, a form with `method="dialog"`).
 */
export function bindModalDialog(
  dialog: DialogLike,
  env: DialogEnvironment,
  onClose?: () => void,
): ModalDialogBinding {
  let opener: FocusTarget | null = null
  let release: (() => void) | null = null
  let destroyed = false

  const finish = () => {
    release?.()
    release = null
    const target = opener
    opener = null
    // The browser has usually moved focus back by now; this covers the cases where it hasn't.
    if (target?.isConnected && env.activeElement() !== target) target.focus()
  }

  const handleClose = () => {
    finish()
    onClose?.()
  }
  dialog.addEventListener('close', handleClose)

  return {
    show() {
      if (destroyed || dialog.open) return
      opener = env.activeElement()
      release = env.lockScroll()
      dialog.showModal()
    },
    hide() {
      if (!destroyed && dialog.open) dialog.close()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      dialog.removeEventListener('close', handleClose)
      // Closing here is silent: the owner is already gone, so nobody is told.
      if (dialog.open) dialog.close()
      finish()
    },
  }
}

/** The page's own environment. Created on first use, so importing this file touches no browser API. */
let pageLock: (() => () => void) | undefined

export function pageEnvironment(): DialogEnvironment {
  pageLock ??= createScrollLock(document.documentElement)
  return {
    activeElement: () =>
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    lockScroll: pageLock,
  }
}
