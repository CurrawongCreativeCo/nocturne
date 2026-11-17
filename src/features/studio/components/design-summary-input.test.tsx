// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { FormPatch, ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defaultSummaryWording, type DesignSummaryConfig } from '@/lib/sanity/design-summary'

import { DesignSummaryInput } from './design-summary-input'

const theme = buildTheme()
afterEach(cleanup)

/** A section's Cards and Text: the shared summary on an object that always applies. */
const CARDS: DesignSummaryConfig = {
  scope: 'card',
  groups: [
    { id: 'cards', title: 'Cards' },
    { id: 'text', title: 'Text' },
  ],
  properties: [
    { group: 'cards', key: 'border', label: 'border' },
    { group: 'cards', key: 'shadow', label: 'shadow' },
    { group: 'text', key: 'title', part: 'size', label: 'title size' },
  ],
  ...defaultSummaryWording('card', 'the site design'),
}

function setup(value: Record<string, unknown> | undefined, readOnly = false) {
  const onChange = vi.fn<(patches: FormPatch | FormPatch[]) => void>()
  render(
    <ThemeProvider theme={theme}>
      <DesignSummaryInput
        summary={CARDS}
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

describe('DesignSummaryInput on a section’s cards', () => {
  it('says the cards follow the site design, names the scope, and offers no reset', () => {
    setup(undefined)
    expect(screen.getByText('Uses the site design')).toBeTruthy()
    expect(screen.getByText(/all cards in this section/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull()
    expect(screen.getByText('the fields')).toBeTruthy()
  })

  it('counts what changes, names the scope, and lists the changes', () => {
    setup({ border: 'none', title: { size: 'large' } })
    expect(screen.getByText('Customised · 2 changes')).toBeTruthy()
    expect(
      screen.getByText('All cards in this section. Everything not listed follows the site design.'),
    ).toBeTruthy()
    expect(screen.getByText('Changes: border, title size.')).toBeTruthy()
  })

  it('resets everything with one patch on its own object', () => {
    const onChange = setup({ border: 'thin' })
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'unset', path: [] }))
  })

  it('resets one group, clearing only its own saved keys', () => {
    const onChange = setup({ border: 'thin', shadow: 'flat', title: { size: 'large' } })
    expect(screen.getByRole('button', { name: 'Reset cards (2)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset text (1)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset cards (2)' }))
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'unset', path: ['border'] }),
      expect.objectContaining({ type: 'unset', path: ['shadow'] }),
    ])
  })

  it('disables the resets when read-only', () => {
    setup({ border: 'thin' }, true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reset all' }).disabled).toBe(true)
  })
})
