// @vitest-environment jsdom
/**
 * The preset and icon pickers by keyboard, in a DOM: arrows move between cards, Enter and Space
 * are left to the browser's own button activation (nothing intercepts them), choosing or Escape
 * folds the grid away and focus returns to "Change". jsdom does not turn Enter or Space into a
 * click, so the choice itself is made with click(); the tests prove the keys are not swallowed.
 */
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { StringInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IconPickerInput } from './icon-picker-input'
import { PickerView } from './preset-picker/picker-view'

const options = [
  { value: 'a', title: 'Alpha', description: 'First' },
  { value: 'b', title: 'Bravo', description: 'Second' },
  { value: 'c', title: 'Charlie', description: 'Third' },
]

function Harness({ initial = 'a' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <ThemeProvider theme={buildTheme()}>
      <PickerView options={options} value={value} onSelect={setValue} label="Layout" />
    </ThemeProvider>
  )
}

afterEach(cleanup)

/** All three pickers here have three cards; the tuple keeps indexed access strict. */
function cards() {
  return screen.getAllByRole('radio') as [HTMLElement, HTMLElement, HTMLElement]
}

function open() {
  const change = screen.getByRole('button', { name: 'Change Layout' })
  fireEvent.click(change)
  return change
}

describe('PickerView by keyboard', () => {
  it('names its Change and Close buttons', () => {
    render(<Harness />)
    expect(
      screen.getByRole('button', { name: 'Change Layout' }).getAttribute('aria-expanded'),
    ).toBe('false')
    open()
    expect(screen.getByRole('button', { name: 'Close Layout options' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeTruthy()
  })

  it('moves focus into the chosen card, with one tab stop', () => {
    render(<Harness initial="b" />)
    open()
    const radios = cards()
    expect(document.activeElement).toBe(radios[1])
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1])
  })

  it('moves between cards with the arrow keys, Home and End', () => {
    render(<Harness />)
    open()
    const radios = cards()
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(radios[1])
    fireEvent.keyDown(radios[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(radios[2])
    fireEvent.keyDown(radios[2], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(radios[1])
    fireEvent.keyDown(radios[1], { key: 'End' })
    expect(document.activeElement).toBe(radios[2])
    fireEvent.keyDown(radios[2], { key: 'Home' })
    expect(document.activeElement).toBe(radios[0])
  })

  it('leaves Enter and Space to the button, so the browser activates the card', () => {
    render(<Harness />)
    open()
    const [, radio] = cards()
    expect(fireEvent.keyDown(radio, { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(radio, { key: ' ' })).toBe(true)
    expect(radio.tagName).toBe('BUTTON')
  })

  it('chooses a card, folds the grid away and returns focus to Change', () => {
    render(<Harness />)
    open()
    fireEvent.click(cards()[2])
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change Layout' }))
    expect(screen.getByText('Charlie')).toBeTruthy()
  })

  it('closes with Escape and with Close, keeping the value and returning focus', () => {
    render(<Harness />)
    open()
    fireEvent.keyDown(cards()[0], { key: 'Escape' })
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change Layout' }))

    open()
    fireEvent.click(screen.getByRole('button', { name: 'Close Layout options' }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change Layout' }))
    expect(screen.getByText('Alpha')).toBeTruthy()
  })

  it('stops Escape from reaching an enclosing dialog', () => {
    const outer = vi.fn()
    render(
      <div role="presentation" onKeyDown={outer}>
        <Harness />
      </div>,
    )
    open()
    fireEvent.keyDown(cards()[0], { key: 'Escape' })
    expect(outer).not.toHaveBeenCalled()
  })

  it('does not open when read-only', () => {
    render(
      <ThemeProvider theme={buildTheme()}>
        <PickerView options={options} value="a" onSelect={vi.fn()} label="Layout" readOnly />
      </ThemeProvider>,
    )
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Change Layout' }).disabled).toBe(
      true,
    )
  })
})

describe('IconPickerInput by keyboard', () => {
  const onChange = vi.fn()
  const props = (value?: string) =>
    ({
      schemaType: { name: 'icon', title: 'Icon', options: { list: ['star', 'check'] } },
      value,
      onChange,
      readOnly: false,
      path: ['icon'],
      elementProps: { id: 'icon', ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
    }) as unknown as StringInputProps

  it('starts on "No icon", is named, and arrows reach the icons', () => {
    render(
      <ThemeProvider theme={buildTheme()}>
        <IconPickerInput {...props()} />
      </ThemeProvider>,
    )
    // Nothing chosen yet but "No icon" is an option, so the summary shows with a named Change button.
    fireEvent.click(screen.getByRole('button', { name: 'Change Icon' }))
    const radios = cards()
    expect(radios).toHaveLength(3)
    expect(screen.getByRole('radio', { name: /No icon/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(radios[1])
    fireEvent.click(radios[1])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change Icon' }))
  })
})
