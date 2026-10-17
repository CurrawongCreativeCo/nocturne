/** The part of <html> the lock changes. */
export interface LockTarget {
  style: { overflow: string; scrollbarGutter: string }
}

/**
 * Stops the page behind a modal dialog scrolling (it is inert, but a wheel or swipe still moves
 * it). `scrollbar-gutter: stable` keeps the scrollbar's space while `overflow` is hidden, so the
 * page doesn't jump sideways where scrollbars take room; no measuring needed.
 *
 * Locks are counted, so a dialog opening over another (a panel over quick search) leaves the page
 * locked until the last one closes, and each release is safe to call twice.
 */
export function createScrollLock(target: LockTarget) {
  let locks = 0
  let saved: { overflow: string; scrollbarGutter: string } | null = null

  return function lock(): () => void {
    if (locks === 0) {
      saved = { overflow: target.style.overflow, scrollbarGutter: target.style.scrollbarGutter }
      target.style.scrollbarGutter = 'stable'
      target.style.overflow = 'hidden'
    }
    locks += 1

    let released = false
    return () => {
      if (released) return
      released = true
      locks -= 1
      if (locks === 0 && saved) {
        target.style.overflow = saved.overflow
        target.style.scrollbarGutter = saved.scrollbarGutter
        saved = null
      }
    }
  }
}
