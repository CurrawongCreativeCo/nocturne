import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { StringInputProps } from 'sanity'
import { describe, expect, it, vi } from 'vitest'

import { BADGE_ICONS } from '@/lib/sanity/badge-icons'

import { IconPickerInput, iconOptions } from './icon-picker-input'
import { InheritableChoiceInput } from './inheritable-choice-input'
import { OptionGrid } from './preset-picker/option-grid'

const theme = buildTheme()
const render = (element: ReactElement) =>
  renderToStaticMarkup(<ThemeProvider theme={theme}>{element}</ThemeProvider>)

/** Just enough of a string input's props for these inputs. */
function props(options: Record<string, unknown>, value?: string): StringInputProps {
  return {
    schemaType: { name: 'field', title: 'Field', options },
    value,
    onChange: vi.fn(),
    readOnly: false,
    path: ['field'],
    elementProps: { id: 'field', ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
  } as unknown as StringInputProps
}

describe('InheritableChoiceInput', () => {
  const options = {
    list: [
      { value: 'none', title: 'None' },
      { value: 'thin', title: 'Thin' },
    ],
    inheritable: true,
  }

  it('shows Inherit first, chosen while nothing is stored', () => {
    const html = render(<InheritableChoiceInput {...props(options)} />)
    expect(html.indexOf('Inherit')).toBeLessThan(html.indexOf('None'))
    expect(html).toMatch(/aria-pressed="true"[^>]*data-choice="inherit"/)
  })

  it('shows a stored None as chosen: an explicit value, not inherit', () => {
    const html = render(<InheritableChoiceInput {...props(options, 'none')} />)
    expect(html).toMatch(/aria-pressed="true"[^>]*data-choice="none"/)
    expect(html).toMatch(/aria-pressed="false"[^>]*data-choice="inherit"/)
  })

  it('can name the inherit choice', () => {
    const html = render(
      <InheritableChoiceInput
        {...props({ ...options, inheritable: 'Use the Link list design' })}
      />,
    )
    expect(html).toContain('Use the Link list design')
  })
})

describe('IconPickerInput', () => {
  const list = BADGE_ICONS.map(({ value, title }) => ({ value, title }))

  it('starts folded on No icon, so a link’s form stays short', () => {
    const html = render(<IconPickerInput {...props({ list, iconPicker: true })} />)
    expect(html).toContain('No icon')
    expect(html).toContain('Change')
  })

  it('opens to each icon drawn above its name, No icon first, as a keyboard radio group', () => {
    const html = render(
      <OptionGrid
        compact
        options={iconOptions(list)}
        value="gift"
        onSelect={vi.fn()}
        label="Icon"
      />,
    )
    expect(html).toMatch(/aria-checked="true" tabindex="0" data-option="gift"/)
    expect(html).toContain('role="radiogroup"')
    expect(html.indexOf('No icon')).toBeLessThan(html.indexOf('Lotus'))
    for (const name of ['Lotus', 'Gift', 'Tick']) expect(html).toContain(name)
    // One drawing per icon, plus nothing for No icon.
    expect(html.match(/<svg viewBox="0 0 24 24"/g)?.length).toBe(BADGE_ICONS.length)
  })

  it('shows a saved icon collapsed, with its drawing and a Change button', () => {
    const html = render(<IconPickerInput {...props({ list, iconPicker: true }, 'lotus')} />)
    expect(html).toContain('Lotus')
    expect(html).toContain('Change')
    expect(html.match(/<svg viewBox="0 0 24 24"/g)?.length).toBe(1)
  })
})
