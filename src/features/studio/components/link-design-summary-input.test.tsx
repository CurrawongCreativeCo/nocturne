// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { FormPatch, ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LinkDesignSummaryInput } from './link-design-summary-input'

const theme = buildTheme()
afterEach(cleanup)

function setup(value: Record<string, unknown> | undefined, readOnly = false) {
  const onChange = vi.fn<(patches: FormPatch | FormPatch[]) => void>()
  render(
    <ThemeProvider theme={theme}>
      <LinkDesignSummaryInput
        {...({
          value,
          onChange,
          readOnly,
          renderDefault: () => <div>the fields</div>,
        } as unknown as ObjectInputProps)}
      />
    </ThemeProvider>,
  )
  return onChange
}

describe('LinkDesignSummaryInput', () => {
  it('says a link uses the list’s design and offers no reset', () => {
    setup(undefined)
    expect(screen.getByText('Uses the Link list design')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull()
    expect(screen.getByText('the fields')).toBeTruthy()
  })

  it('names what a customised link changes, and at which level', () => {
    setup({ appearance: 'custom', border: 'thin', label: { colour: { colour: 'accent' } } })
    expect(screen.getByText('Customised · 2 changes')).toBeTruthy()
    expect(screen.getByText(/This link only/)).toBeTruthy()
    expect(screen.getByText('Changes: border, label colour.')).toBeTruthy()
  })

  it('resets the whole link with one patch on its own design', () => {
    const onChange = setup({ appearance: 'custom', border: 'thin' })
    fireEvent.click(screen.getByRole('button', { name: 'Reset this link' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'unset', path: [] }))
  })

  it('resets one group, clearing only its own saved keys', () => {
    const onChange = setup({
      appearance: 'custom',
      border: 'thin',
      shadow: 'soft',
      label: { size: 'large' },
      arrowStyle: 'none',
    })
    expect(screen.getByRole('button', { name: 'Reset card (2)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset text (1)' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /reset icon/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset card (2)' }))
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'unset', path: ['border'] }),
      expect.objectContaining({ type: 'unset', path: ['shadow'] }),
    ])
  })

  it('says saved choices are kept but not applied when the link follows the list', () => {
    setup({ border: 'thin' })
    expect(screen.getByText(/1 saved choice is kept but not applied/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset card (1)' })).toBeTruthy()
  })

  it('disables the resets when read-only', () => {
    setup({ appearance: 'custom', border: 'thin' }, true)
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Reset this link' }).disabled,
    ).toBe(true)
  })
})
