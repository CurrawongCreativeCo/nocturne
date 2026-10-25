// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { FormValueProvider, type NumberInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SliderInput } from './slider-input'

const theme = buildTheme()
afterEach(cleanup)

const STYLE = { overlay: 'medium' }

function slider(
  value: number | undefined,
  inherited?: (context: { container: unknown }) => { value: number; source: string },
): ReactElement {
  return (
    <SliderInput
      {...({
        value,
        path: ['style', 'overlayGradientTop', 'opacity'],
        onChange: vi.fn(),
        readOnly: false,
        schemaType: {
          name: 'number',
          title: 'Opacity',
          options: { slider: { min: 0, max: 90, step: 1, unit: '%', inherited } },
        },
        elementProps: { id: 'x', ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
      } as unknown as NumberInputProps)}
    />
  )
}

/** Inside a form whose document holds `STYLE`, as in the Studio. */
function renderInForm(element: ReactElement) {
  render(
    <ThemeProvider theme={theme}>
      <FormValueProvider value={{ _id: 'page', _type: 'page', style: STYLE }}>
        {element}
      </FormValueProvider>
    </ThemeProvider>,
  )
  return screen.getByRole<HTMLInputElement>('slider')
}

describe('SliderInput', () => {
  const even = () => ({ value: 55, source: 'Even atmosphere preset' })

  it('rests on the inherited value and says where it comes from while unset', () => {
    const input = renderInForm(slider(undefined, even))
    expect(input.value).toBe('55')
    expect(input.getAttribute('aria-valuetext')).toBe('55% from the Even atmosphere preset')
    expect(screen.getByText('Following the Even atmosphere preset.')).toBeTruthy()
  })

  it('shows the chosen value and no source once set', () => {
    const input = renderInForm(slider(30, even))
    expect(input.value).toBe('30')
    expect(input.getAttribute('aria-valuetext')).toBe('30%')
    expect(screen.queryByText(/Following/)).toBeNull()
  })

  it('reads the object above the number’s own object from the form', () => {
    const inherited = vi.fn(even)
    renderInForm(slider(undefined, inherited))
    expect(inherited).toHaveBeenCalledWith({ container: STYLE })
  })

  it('renders outside a form when it follows nothing (the brand preview’s examples)', () => {
    render(<ThemeProvider theme={theme}>{slider(undefined)}</ThemeProvider>)
    const input = screen.getByRole<HTMLInputElement>('slider')
    expect(input.getAttribute('aria-valuetext')).toBe('Follows the preset')
    expect(screen.getByText('Preset')).toBeTruthy()
    expect(screen.queryByText(/Following/)).toBeNull()
  })
})
