// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  PatchEvent,
  toMutationPatches,
  type FormPatch,
  type InputProps,
  type StringInputProps,
} from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DIVIDER_DEFAULT_CHOICE } from '@/lib/sanity/divider-options'
import { decorativeDivider } from '@/lib/sanity/schema/decorative-divider'

import { InheritableChoiceInput } from './inheritable-choice-input'
import { withPresetPicker } from './preset-picker/with-preset-picker'

/**
 * Clearing the shared divider's six radio fields in Studio (task 151). Studio's own radio clear is an icon with no
 * accessible name, and its field menu has only Copy and Paste, so each field starts with a labelled choice that unsets
 * it ("Use divider default"). The controls are built from the real `decorativeDivider` fields, and their patches are
 * placed where a hero's divider stores them, so the tests show exactly which stored path changes.
 */

// The Studio's inputs reach the Sanity project's settings, which a unit test has no .env for (as with-preset-picker.test).
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

const theme = buildTheme()
afterEach(cleanup)

interface Field {
  name: string
  title: string
  type: string
  options?: Record<string, unknown>
  hidden?: unknown
}
const fieldOf = (name: string): Field => {
  const field = (decorativeDivider.fields as unknown as Field[]).find(
    (candidate) => candidate.name === name,
  )
  if (!field) throw new Error(`No divider field named ${name}`)
  return field
}

type OnChange = ReturnType<typeof vi.fn<(patches: FormPatch | FormPatch[]) => void>>

/** The patches as stored: prefixed by the field's place in a hero's divider, then made into mutations. */
const DIVIDER = ['pageBuilder', { _key: 'h1' }, 'dividerDesign'] as const
function asStored(patch: FormPatch | FormPatch[], field: string) {
  let event = PatchEvent.from(patch).prefixAll(field)
  for (const segment of [...DIVIDER].reverse()) event = event.prefixAll(segment)
  return toMutationPatches(event.patches)
}

const stringProps = (
  field: Field,
  value: string | undefined,
  onChange: OnChange,
  readOnly = false,
) =>
  ({
    schemaType: {
      name: field.name,
      title: field.title,
      jsonType: 'string',
      options: field.options,
    },
    value,
    onChange,
    readOnly,
    path: ['dividerDesign', field.name],
    elementProps: { id: field.name, ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
  }) as unknown as StringInputProps

function renderString(name: string, value?: string, readOnly = false) {
  const onChange: OnChange = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <InheritableChoiceInput {...stringProps(fieldOf(name), value, onChange, readOnly)} />
    </ThemeProvider>,
  )
  return onChange
}

// Each field, its title, its own choices in order, and a value to clear.
const DIVIDER_FIELDS = [
  [
    'centre',
    'In the middle',
    ['Nothing', 'Diamond', 'Icon', 'Words', 'Picture', 'Ornament'],
    'text',
  ],
  ['textCase', 'Letters', ['As typed', 'Capitals'], 'uppercase'],
  ['letterSpacing', 'Letter spacing', ['Normal', 'Wide', 'Extra wide'], 'wide'],
  ['centreSize', 'Size in the middle', ['Small', 'Medium', 'Large'], 'large'],
  ['width', 'Length', ['Short', 'Medium', 'Long', 'Full width'], 'long'],
  ['thickness', 'Thickness', ['Thin', 'Bold'], 'bold'],
] as const

describe.each(DIVIDER_FIELDS)(
  'Divider %s: its first choice clears it',
  (name, title, choices, stored) => {
    it(`is a group named “${title}” that offers “${DIVIDER_DEFAULT_CHOICE}” first, chosen while nothing is saved`, () => {
      expect(fieldOf(name).options?.inheritable).toBe(DIVIDER_DEFAULT_CHOICE)
      renderString(name)
      const group = screen.getByRole('group', { name: title })
      const buttons = within(group).getAllByRole('button')
      expect(buttons.map((button) => button.textContent)).toEqual([
        DIVIDER_DEFAULT_CHOICE,
        ...choices,
      ])
      // Every control has a name of its own: none is an unlabelled icon.
      for (const button of buttons) expect(button.textContent.trim()).not.toBe('')
      expect(
        screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE }).getAttribute('aria-pressed'),
      ).toBe('true')
    })

    it('shows a saved value as chosen, and clears it with one unset of that field only', () => {
      const onChange = renderString(name, stored)
      expect(
        screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE }).getAttribute('aria-pressed'),
      ).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE }))
      expect(onChange).toHaveBeenCalledTimes(1)
      const [patch] = onChange.mock.calls[0] ?? []
      // Stored: one unset of this field; the style and every sibling are not named.
      expect(asStored(patch as FormPatch, name)).toEqual([
        { unset: [`pageBuilder[_key=="h1"].dividerDesign.${name}`] },
      ])
    })

    it('sets a choice on its own path only', () => {
      const onChange = renderString(name)
      fireEvent.click(screen.getByRole('button', { name: choices[0] }))
      const [patch] = onChange.mock.calls[0] ?? []
      expect(patch).toMatchObject({ type: 'set', path: [] })
      expect(asStored(patch as FormPatch, name)).toHaveLength(1)
    })

    it('also clears a value that is no longer one of the choices', () => {
      const onChange = renderString(name, 'retired-value')
      for (const button of screen.getAllByRole('button'))
        expect(button.getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE }))
      expect(onChange.mock.calls[0]?.[0]).toMatchObject({ type: 'unset', path: [] })
    })

    it('changes nothing in read-only mode: every choice is disabled', () => {
      const onChange = renderString(name, stored, true)
      for (const button of screen.getAllByRole('button'))
        expect(button.hasAttribute('disabled')).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE }))
      expect(onChange).not.toHaveBeenCalled()
    })

    it('is drawn by Studio’s input router as the inherit-first choice', () => {
      const Routed = withPresetPicker(() => <div>fallback</div>)
      render(
        <ThemeProvider theme={theme}>
          <Routed {...(stringProps(fieldOf(name), undefined, vi.fn()) as unknown as InputProps)} />
        </ThemeProvider>,
      )
      expect(screen.getByRole('button', { name: DIVIDER_DEFAULT_CHOICE })).toBeTruthy()
      expect(screen.queryByText('fallback')).toBeNull()
    })
  },
)

describe('Divider fields keep their hiding rules, and a hidden value is kept', () => {
  const hidden = (name: string, parent: Record<string, unknown>, value?: unknown) =>
    (fieldOf(name).hidden as (context: never) => boolean)({ parent, value } as never)

  it('hides the centre, length and thickness under Three dots, even with a value stored', () => {
    const parent = { style: 'dots', centre: 'diamond', width: 'long', thickness: 'bold' }
    expect(hidden('centre', parent, 'diamond')).toBe(true)
    expect(hidden('width', parent, 'long')).toBe(true)
    expect(hidden('thickness', parent, 'bold')).toBe(true)
  })

  it('shows them for a Gradient, and hides only its line colour, stored or not', () => {
    const parent = { style: 'gradient', centre: 'diamond', lineColour: { colour: 'accent' } }
    expect(hidden('centre', parent, 'diamond')).toBe(false)
    expect(hidden('width', parent)).toBe(false)
    expect(hidden('thickness', parent)).toBe(false)
    expect(hidden('lineColour', parent, { colour: 'accent' })).toBe(true)
  })

  it('shows the words fields only for Words, and the size only for an icon, words, picture or ornament', () => {
    expect(hidden('textCase', { style: 'line', centre: 'text' })).toBe(false)
    expect(hidden('letterSpacing', { style: 'line', centre: 'diamond' }, 'wide')).toBe(true)
    expect(hidden('centreSize', { style: 'line', centre: 'ornament' })).toBe(false)
    expect(hidden('centreSize', { style: 'line', centre: 'none' }, 'large')).toBe(true)
  })

  it('stores nothing until a choice is made: no field has an initial value', () => {
    for (const [name] of DIVIDER_FIELDS) expect(fieldOf(name)).not.toHaveProperty('initialValue')
  })
})
