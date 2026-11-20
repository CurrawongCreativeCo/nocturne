// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  PatchEvent,
  toMutationPatches,
  type BooleanInputProps,
  type FormPatch,
  type InputProps,
  type StringInputProps,
} from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { sectionStyle } from '@/lib/sanity/schema/section-style'

import { ClearableBooleanInput } from './clearable-boolean-input'
import { InheritableChoiceInput } from './inheritable-choice-input'
import { withPresetPicker } from './preset-picker/with-preset-picker'

/**
 * Clearing a section's Alignment, the generated edge's Crest position, Depth, Layer strength, Colours and Layer
 * below, and Tide's Crest colour, Contour's Line colour and Elevated's Shadow in Studio (task 151). Studio's field menu offers only Copy and Paste, so each string field starts with a
 * labelled choice that unsets it (InheritableChoiceInput, as the per-layer colours do), and Layer below has a
 * labelled button beside its switch that unsets a saved true or false. The controls are built from the real schema
 * field definitions, and their patches are placed where Studio would place them, so the tests show exactly which
 * stored path changes.
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
}
const fieldOf = (name: string): Field => {
  const field = (sectionStyle.fields as unknown as Field[]).find(
    (candidate) => candidate.name === name,
  )
  if (!field) throw new Error(`No section style field named ${name}`)
  return field
}

type OnChange = ReturnType<typeof vi.fn<(patches: FormPatch | FormPatch[]) => void>>

/** The patches as stored: prefixed by the field's place in a page section's style, then made into mutations. */
const STYLE = ['pageBuilder', { _key: 's1' }, 'style'] as const
function asStored(patch: FormPatch | FormPatch[], field: string) {
  let event = PatchEvent.from(patch).prefixAll(field)
  for (const segment of [...STYLE].reverse()) event = event.prefixAll(segment)
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
    path: ['style', field.name],
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

const booleanProps = (value: boolean | undefined | null, onChange: OnChange, readOnly = false) => {
  const field = fieldOf('edgeLayerBelow')
  return {
    schemaType: {
      name: field.name,
      title: field.title,
      jsonType: 'boolean',
      options: field.options,
    },
    value,
    onChange,
    readOnly,
    path: ['style', field.name],
    renderDefault: () => <div>the switch</div>,
  } as unknown as BooleanInputProps
}

function renderBoolean(value: boolean | undefined | null, readOnly = false) {
  const onChange: OnChange = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <ClearableBooleanInput {...booleanProps(value, onChange, readOnly)} />
    </ThemeProvider>,
  )
  return onChange
}

// Each string field, its first choice, then its own choices in order, and a value to clear.
const STRING_FIELDS = [
  ['align', 'Alignment', 'Use layout default', ['Start', 'Centre'], 'center'],
  [
    'edgeCrest',
    'Crest position',
    'Use shape default',
    ['Standard', 'Centred', 'Shifted'],
    'shifted',
  ],
  ['edgeDepth', 'Layer spacing', 'Use shape default', ['Close', 'Standard', 'Wide'], 'deep'],
  ['edgeStrength', 'Layer strength', 'Use shape default', ['Light', 'Standard', 'Strong'], 'light'],
  ['edgePalette', 'Colours', 'Use shape default', ['Tint', 'Ink', 'Highlight'], 'ink'],
  // Tide's, Contour's and Elevated's own choices: once Studio radios whose only clear was an unnamed icon.
  ['edgeTideLayer', 'Crest colour', 'Use shape default', ['Primary', 'Echo', 'Secondary'], 'echo'],
  ['edgeLineColour', 'Line colour', 'Use shape default', ['Primary', 'Muted text'], 'muted'],
  ['edgeShadow', 'Shadow', 'Use shape default', ['Soft', 'Deep'], 'deep'],
] as const

describe.each(STRING_FIELDS)(
  '%s: its first choice clears it',
  (name, title, clear, choices, stored) => {
    it(`is a group named “${title}” that offers “${clear}” first, chosen while nothing is saved`, () => {
      expect(fieldOf(name).options?.inheritable).toBe(clear)
      renderString(name)
      const group = screen.getByRole('group', { name: title })
      expect(
        within(group)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual([clear, ...choices])
      expect(screen.getByRole('button', { name: clear }).getAttribute('aria-pressed')).toBe('true')
    })

    it('shows a saved value as chosen, and clears it with one unset of that field only', () => {
      const onChange = renderString(name, stored)
      expect(screen.getByRole('button', { name: clear }).getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: clear }))
      expect(onChange).toHaveBeenCalledTimes(1)
      const [patch] = onChange.mock.calls[0] ?? []
      expect(patch).toMatchObject({ type: 'unset', path: [] })
      // Stored: one unset of this field; the edge, its other controls and every other style setting are not named.
      expect(asStored(patch as FormPatch, name)).toEqual([
        { unset: [`pageBuilder[_key=="s1"].style.${name}`] },
      ])
    })

    it('also clears a value that is no longer one of the choices', () => {
      const onChange = renderString(name, 'retired-value')
      for (const button of screen.getAllByRole('button'))
        expect(button.getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: clear }))
      expect(onChange.mock.calls[0]?.[0]).toMatchObject({ type: 'unset', path: [] })
    })

    it('changes nothing in read-only mode: every choice is disabled', () => {
      const onChange = renderString(name, stored, true)
      for (const button of screen.getAllByRole('button'))
        expect(button.hasAttribute('disabled')).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: clear }))
      expect(onChange).not.toHaveBeenCalled()
    })
  },
)

describe('Layer below: the switch and its clear button', () => {
  const name = 'Layer below: Use shape default'

  it('keeps Studio’s own switch and adds one native button, named for the field and its visible label', () => {
    expect(fieldOf('edgeLayerBelow').options?.clearable).toBe('Use shape default')
    renderBoolean(true)
    expect(screen.getByText('the switch')).toBeTruthy()
    const button = screen.getByRole('button', { name })
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.textContent).toBe('Use shape default')
    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it.each([true, false])(
    'unsets a saved %s in one patch on its own path, leaving every sibling alone',
    (value) => {
      const onChange = renderBoolean(value)
      fireEvent.click(screen.getByRole('button', { name }))
      expect(onChange).toHaveBeenCalledTimes(1)
      const [patch] = onChange.mock.calls[0] ?? []
      expect(patch).toMatchObject({ type: 'unset', path: [] })
      expect(asStored(patch as FormPatch, 'edgeLayerBelow')).toEqual([
        { unset: ['pageBuilder[_key=="s1"].style.edgeLayerBelow'] },
      ])
    },
  )

  it.each([undefined, null])('is disabled while nothing is saved (%s)', (value) => {
    const onChange = renderBoolean(value)
    const button = screen.getByRole('button', { name })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is disabled in read-only mode, even with a value saved, and emits nothing', () => {
    const onChange = renderBoolean(false, true)
    const button = screen.getByRole('button', { name })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Studio’s input router', () => {
  const Fallback = () => <div>fallback</div>
  const Routed = withPresetPicker(Fallback)

  it.each(STRING_FIELDS.map(([name, , clear]) => [name, clear] as const))(
    'draws %s as the inherit-first choice, from the schema’s own option',
    (name, clear) => {
      render(
        <ThemeProvider theme={theme}>
          <Routed {...(stringProps(fieldOf(name), undefined, vi.fn()) as unknown as InputProps)} />
        </ThemeProvider>,
      )
      expect(screen.getByRole('button', { name: clear })).toBeTruthy()
      expect(screen.queryByText('fallback')).toBeNull()
    },
  )

  it('draws Layer below with its clear button, and leaves any other switch to the fallback', () => {
    render(
      <ThemeProvider theme={theme}>
        <Routed {...(booleanProps(true, vi.fn()) as unknown as InputProps)} />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Layer below: Use shape default' })).toBeTruthy()
    cleanup()
    const invert = fieldOf('edgeInvert')
    render(
      <ThemeProvider theme={theme}>
        <Routed
          {...({
            schemaType: { name: invert.name, title: invert.title, jsonType: 'boolean' },
            value: true,
            onChange: vi.fn(),
            path: ['style', 'edgeInvert'],
          } as unknown as InputProps)}
        />
      </ThemeProvider>,
    )
    expect(screen.getByText('fallback')).toBeTruthy()
  })
})
