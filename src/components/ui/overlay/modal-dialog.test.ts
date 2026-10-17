import { describe, expect, it, vi } from 'vitest'

import {
  bindModalDialog,
  type DialogEnvironment,
  type DialogLike,
  type FocusTarget,
} from './modal-dialog'

/** Behaves like <dialog>: showModal opens it, close() closes it and then fires `close`. */
class FakeDialog extends EventTarget implements DialogLike {
  open = false
  showModal = vi.fn(() => {
    this.open = true
  })
  close = vi.fn(() => {
    this.open = false
    this.dispatchEvent(new Event('close'))
  })
  override addEventListener(type: 'close', listener: () => void) {
    super.addEventListener(type, listener)
  }
  override removeEventListener(type: 'close', listener: () => void) {
    super.removeEventListener(type, listener)
  }
}

function setup() {
  const dialog = new FakeDialog()
  const opener: FocusTarget = { isConnected: true, focus: vi.fn() }
  const state = { active: opener as FocusTarget | null, locked: 0 }
  const env: DialogEnvironment = {
    activeElement: () => state.active,
    lockScroll: () => {
      state.locked += 1
      return () => {
        state.locked -= 1
      }
    },
  }
  const onClose = vi.fn()
  const binding = bindModalDialog(dialog, env, onClose)
  return { dialog, opener, state, onClose, binding }
}

describe('bindModalDialog', () => {
  it('opens as a modal and locks the page', () => {
    const { binding, dialog, state } = setup()
    binding.show()
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(state.locked).toBe(1)
  })

  it('does not open twice, or lock twice', () => {
    const { binding, dialog, state } = setup()
    binding.show()
    binding.show()
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(state.locked).toBe(1)
  })

  it('unlocks and reports once when the dialog closes itself (Escape, a Close button)', () => {
    const { binding, dialog, state, onClose } = setup()
    binding.show()
    dialog.close()
    expect(state.locked).toBe(0)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when told to, and reports it', () => {
    const { binding, state, onClose } = setup()
    binding.show()
    binding.hide()
    expect(state.locked).toBe(0)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ignores hide while closed', () => {
    const { binding, dialog } = setup()
    binding.hide()
    expect(dialog.close).not.toHaveBeenCalled()
  })

  it('gives focus back to what opened it when the browser has not', () => {
    const { binding, dialog, state, opener } = setup()
    binding.show()
    state.active = null
    dialog.close()
    expect(opener.focus).toHaveBeenCalledOnce()
  })

  it('leaves focus alone when the browser already returned it', () => {
    const { binding, dialog, opener } = setup()
    binding.show()
    dialog.close()
    expect(opener.focus).not.toHaveBeenCalled()
  })

  it('does not focus an opener that has left the page', () => {
    const { binding, dialog, state, opener } = setup()
    binding.show()
    state.active = null
    opener.isConnected = false
    dialog.close()
    expect(opener.focus).not.toHaveBeenCalled()
  })

  it('remembers a new opener each time it opens', () => {
    const { binding, dialog, state, opener } = setup()
    binding.show()
    dialog.close()
    const second: FocusTarget = { isConnected: true, focus: vi.fn() }
    state.active = second
    binding.show()
    state.active = null
    dialog.close()
    expect(second.focus).toHaveBeenCalledOnce()
    expect(opener.focus).not.toHaveBeenCalled()
  })

  it('cleans up silently when its owner goes away while it is open', () => {
    const { binding, dialog, state, onClose } = setup()
    binding.show()
    binding.destroy()
    expect(dialog.open).toBe(false)
    expect(state.locked).toBe(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stops listening and refuses to open after it is destroyed', () => {
    const { binding, dialog, onClose } = setup()
    binding.destroy()
    binding.show()
    expect(dialog.showModal).not.toHaveBeenCalled()
    dialog.dispatchEvent(new Event('close'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
