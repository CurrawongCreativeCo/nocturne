// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FixOutcome } from '@/lib/color/contrast-remedy'

import { ContrastFixPanel, type ContrastFixAction } from './contrast-fix-panel'

const theme = buildTheme()
const noop = vi.fn<() => void>()
afterEach(cleanup)

/** A field that holds one string, with a fix that changes it and an Undo that puts it back. */
function Harness({ outcome }: { outcome?: (value: string) => FixOutcome }) {
  const [value, setValue] = useState('before')
  const actions: ContrastFixAction[] =
    value === 'before'
      ? [
          {
            id: 'fix',
            label: 'Use suggested colour',
            detail: 'Changes it.',
            after: 'after',
            apply: () => {
              setValue('after')
            },
            undo: () => {
              setValue('before')
            },
          },
        ]
      : []
  return (
    <ThemeProvider theme={theme}>
      <output data-testid="value">{value}</output>
      <button
        type="button"
        onClick={() => {
          setValue('edited')
        }}
      >
        edit
      </button>
      <ContrastFixPanel actions={actions} current={value} outcome={outcome?.(value) ?? null} />
    </ThemeProvider>
  )
}

const value = () => screen.getByTestId('value').textContent

describe('ContrastFixPanel', () => {
  it('changes nothing until a button is pressed', () => {
    render(<Harness />)
    expect(value()).toBe('before')
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('applies a fix, says what changed, and undoes it', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested colour' }))
    expect(value()).toBe('after')
    expect(screen.getByText('Changed: use suggested colour.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(value()).toBe('before')
    expect(screen.getAllByText('Undone: use suggested colour.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('shows a fresh measurement after the fix, so a partial improvement never reads as done', () => {
    render(
      <Harness
        outcome={(current) =>
          current === 'after'
            ? { state: 'remaining', text: 'Improved, not fixed: it still measures 2.1:1.' }
            : { state: 'resolved', text: 'unused' }
        }
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested colour' }))
    expect(screen.getByText('Improved, not fixed: it still measures 2.1:1.')).toBeTruthy()
    expect(screen.queryByText(/Now .* meets/)).toBeNull()
  })

  it('drops Undo when the field is edited afterwards, so Undo never overwrites the edit', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested colour' }))
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'edit' }))
    })
    expect(value()).toBe('edited')
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    expect(value()).toBe('edited')
  })

  it('keeps an edit made after Undo', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Use suggested colour' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'edit' }))
    expect(value()).toBe('edited')
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('offers nothing on a read-only field', () => {
    render(
      <ThemeProvider theme={theme}>
        <ContrastFixPanel
          readOnly
          current="x"
          actions={[
            {
              id: 'a',
              label: 'Use suggested colour',
              detail: '',
              after: 'y',
              apply: noop,
              undo: noop,
            },
          ]}
        />
      </ThemeProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Use suggested colour' })).toBeNull()
  })
})
