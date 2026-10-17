import { describe, expect, it } from 'vitest'

import { createScrollLock, type LockTarget } from './scroll-lock'

const page = (): LockTarget => ({ style: { overflow: '', scrollbarGutter: '' } })

describe('createScrollLock', () => {
  it('hides overflow and keeps the scrollbar gutter, so the page cannot shift sideways', () => {
    const target = page()
    createScrollLock(target)()
    expect(target.style).toEqual({ overflow: 'hidden', scrollbarGutter: 'stable' })
  })

  it('puts back what was there before, not a blank', () => {
    const target = page()
    target.style.overflow = 'scroll'
    target.style.scrollbarGutter = 'auto'
    const release = createScrollLock(target)()
    release()
    expect(target.style).toEqual({ overflow: 'scroll', scrollbarGutter: 'auto' })
  })

  it('stays locked until the last of several overlays has closed', () => {
    const target = page()
    const lock = createScrollLock(target)
    const first = lock()
    const second = lock()
    first()
    expect(target.style.overflow).toBe('hidden')
    second()
    expect(target.style.overflow).toBe('')
  })

  it('ignores a second release, so a double close cannot unlock a page another overlay holds', () => {
    const target = page()
    const lock = createScrollLock(target)
    const first = lock()
    lock()
    first()
    first()
    expect(target.style.overflow).toBe('hidden')
  })

  it('can lock again after it was released', () => {
    const target = page()
    const lock = createScrollLock(target)
    lock()()
    lock()
    expect(target.style.overflow).toBe('hidden')
  })
})
