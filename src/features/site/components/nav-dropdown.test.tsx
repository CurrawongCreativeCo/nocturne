// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HOVER_CLOSE_DELAY, HOVER_OPEN_DELAY, NavDropdown } from './nav-dropdown'

afterEach(cleanup)

function draw(withLink = false) {
  render(
    <>
      <NavDropdown label="Services" link={withLink ? <a href="#services">Services</a> : undefined}>
        <li>
          <a href="#design">Design</a>
        </li>
        <li>
          <a href="#build">Build</a>
        </li>
      </NavDropdown>
      <a href="#elsewhere">Elsewhere</a>
    </>,
  )
  const trigger = screen.getByRole('button')
  const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
  const root = trigger.parentElement
  if (!panel || !root) throw new Error('Not drawn')
  return { trigger, panel, root }
}

const isOpen = (trigger: HTMLElement) => trigger.getAttribute('aria-expanded') === 'true'

describe('NavDropdown', () => {
  it('is a disclosure button controlling a plain list of links, closed at first', () => {
    const { trigger, panel } = draw()
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveProperty('type', 'button')
    expect(trigger.textContent).toBe('Services')
    expect(isOpen(trigger)).toBe(false)
    expect(panel.querySelector('ul')?.children).toHaveLength(2)
    expect(document.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
  })

  it('with its own page, shows the link beside a separately named button', () => {
    const { trigger } = draw(true)
    expect(screen.getByRole('link', { name: 'Services' }).getAttribute('href')).toBe('#services')
    expect(trigger.getAttribute('aria-label')).toBe('Services submenu')
  })

  it('marks itself as hydrated so the no-JavaScript CSS fallback turns off', () => {
    expect(draw().root.hasAttribute('data-js')).toBe(true)
  })

  it('toggles on click (Enter and Space click a native button)', () => {
    const { trigger, root } = draw()
    fireEvent.click(trigger)
    expect(isOpen(trigger)).toBe(true)
    expect(root.hasAttribute('data-open')).toBe(true)
    fireEvent.click(trigger)
    expect(isOpen(trigger)).toBe(false)
  })

  it('closes on Escape and returns focus to the button', () => {
    const { trigger } = draw()
    fireEvent.click(trigger)
    act(() => {
      screen.getByRole('link', { name: 'Design' }).focus()
    })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isOpen(trigger)).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when focus leaves it, but not when focus moves inside it', () => {
    const { trigger } = draw()
    fireEvent.click(trigger)
    act(() => {
      trigger.focus()
    })
    act(() => {
      screen.getByRole('link', { name: 'Design' }).focus()
    })
    expect(isOpen(trigger)).toBe(true)
    act(() => {
      screen.getByRole('link', { name: 'Elsewhere' }).focus()
    })
    expect(isOpen(trigger)).toBe(false)
  })

  it('closes on a click outside, and after following one of its links', () => {
    const { trigger } = draw()
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(isOpen(trigger)).toBe(false)
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('link', { name: 'Build' }))
    expect(isOpen(trigger)).toBe(false)
  })

  describe('hover', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('opens after a short delay and closes after leaving', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      expect(isOpen(trigger)).toBe(false)
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY)
      })
      expect(isOpen(trigger)).toBe(true)
      fireEvent.pointerLeave(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_CLOSE_DELAY)
      })
      expect(isOpen(trigger)).toBe(false)
    })

    it('does not open when the pointer only passes over', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      fireEvent.pointerLeave(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY + HOVER_CLOSE_DELAY)
      })
      expect(isOpen(trigger)).toBe(false)
    })

    it('stays open after a click on a hover-opened dropdown, until the pointer has left and a click outside', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY)
      })
      fireEvent.click(trigger)
      expect(isOpen(trigger)).toBe(true)
      fireEvent.pointerLeave(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_CLOSE_DELAY)
      })
      expect(isOpen(trigger)).toBe(true)
      fireEvent.pointerDown(document.body)
      expect(isOpen(trigger)).toBe(false)
    })

    it('stays open while keyboard focus is inside after the pointer leaves, and closes when focus leaves', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY)
      })
      act(() => {
        screen.getByRole('link', { name: 'Design' }).focus()
      })
      fireEvent.pointerLeave(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_CLOSE_DELAY)
      })
      expect(isOpen(trigger)).toBe(true)
      act(() => {
        screen.getByRole('link', { name: 'Elsewhere' }).focus()
      })
      expect(isOpen(trigger)).toBe(false)
    })

    it('stays open when focus moves inside after the pointer left but before it closed', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY)
      })
      fireEvent.pointerLeave(root, { pointerType: 'mouse' })
      act(() => {
        screen.getByRole('link', { name: 'Design' }).focus()
      })
      act(() => {
        vi.advanceTimersByTime(HOVER_CLOSE_DELAY)
      })
      expect(isOpen(trigger)).toBe(true)
    })

    it('ignores touch hover', () => {
      const { trigger, root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'touch' })
      act(() => {
        vi.advanceTimersByTime(HOVER_OPEN_DELAY)
      })
      expect(isOpen(trigger)).toBe(false)
    })

    it('leaves no timer running after unmount', () => {
      const { root } = draw()
      fireEvent.pointerEnter(root, { pointerType: 'mouse' })
      cleanup()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  it('closes when the parent’s own link is followed', () => {
    const { trigger } = draw(true)
    fireEvent.click(trigger)
    expect(isOpen(trigger)).toBe(true)
    fireEvent.click(screen.getByRole('link', { name: 'Services' }))
    expect(isOpen(trigger)).toBe(false)
  })

  it('adds document listeners only while open, and removes them all on close and unmount', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const ours = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'keydown' || type === 'pointerdown').length
    const { trigger } = draw()
    const before = ours(add)
    fireEvent.click(trigger)
    expect(ours(add) - before).toBe(2)
    fireEvent.click(trigger)
    expect(ours(remove)).toBe(2)
    fireEvent.click(trigger)
    cleanup()
    expect(ours(remove)).toBe(4)
    add.mockRestore()
    remove.mockRestore()
  })
})
