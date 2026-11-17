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

import {
  ARCH_DEFAULT_CHOICE,
  OVERLAP_DEFAULT_CHOICE,
  imageDesign,
} from '@/lib/sanity/schema/image-design'

import { ClearableBooleanInput } from './clearable-boolean-input'
import { InheritableChoiceInput } from './inheritable-choice-input'
import { withPresetPicker } from './preset-picker/with-preset-picker'

/**
 * Clearing Image design's Arch ratio and Allow frame overlap in Studio (task 177). Studio's own radio clear is an
 * unnamed icon and a switch stores false when turned off, so Arch ratio starts with a labelled choice that unsets it
 * ("Use default (4:5)") and Allow frame overlap has a labelled button that unsets a saved true or false ("Use default
 * (keep room)"). The controls are built from the real `imageDesign` fields, and the patches are placed where a
 * Gallery's Image design stores them.
 */

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
  options?: Record<string, unknown>
}
const fieldOf = (name: string): Field => {
  const field = (imageDesign.fields as unknown as Field[]).find((each) => each.name === name)
  if (!field) throw new Error(`No imageDesign field named ${name}`)
  return field
}

type OnChange = ReturnType<typeof vi.fn<(patches: FormPatch | FormPatch[]) => void>>
const SECTION = ['pageBuilder', { _key: 'g1' }, 'imageDesign'] as const
function asStored(patch: FormPatch | FormPatch[], field: string) {
  let event = PatchEvent.from(patch).prefixAll(field)
  for (const segment of [...SECTION].reverse()) event = event.prefixAll(segment)
  return toMutationPatches(event.patches)
}

const stringProps = (value: string | undefined, onChange: OnChange, readOnly = false) => {
  const field = fieldOf('archRatio')
  return {
    schemaType: {
      name: field.name,
      title: field.title,
      jsonType: 'string',
      options: field.options,
    },
    value,
    onChange,
    readOnly,
    path: ['imageDesign', field.name],
    elementProps: { id: field.name, ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
  } as unknown as StringInputProps
}

const booleanProps = (value: boolean | undefined, onChange: OnChange, readOnly = false) => {
  const field = fieldOf('frameOverlap')
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
    path: ['imageDesign', field.name],
    renderDefault: () => <div>the switch</div>,
  } as unknown as BooleanInputProps
}

describe('Arch ratio: its first choice goes back to 4:5', () => {
  const renderArch = (value?: string, readOnly = false) => {
    const onChange: OnChange = vi.fn()
    render(
      <ThemeProvider theme={theme}>
        <InheritableChoiceInput {...stringProps(value, onChange, readOnly)} />
      </ThemeProvider>,
    )
    return onChange
  }

  it('is a named group offering “Use default (4:5)” first, chosen while nothing is saved', () => {
    expect(fieldOf('archRatio').options?.inheritable).toBe(ARCH_DEFAULT_CHOICE)
    renderArch()
    const group = screen.getByRole('group', { name: 'Arch ratio' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([ARCH_DEFAULT_CHOICE, '4:5', '3:4', '2:3'])
    expect(
      screen.getByRole('button', { name: ARCH_DEFAULT_CHOICE }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('clears a saved ratio with one unset of that field only', () => {
    const onChange = renderArch('2/3')
    expect(screen.getByRole('button', { name: '2:3' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: ARCH_DEFAULT_CHOICE }))
    expect(asStored(onChange.mock.calls[0]?.[0] as FormPatch, 'archRatio')).toEqual([
      { unset: ['pageBuilder[_key=="g1"].imageDesign.archRatio'] },
    ])
  })

  it('sets a ratio on its own path only', () => {
    const onChange = renderArch()
    fireEvent.click(screen.getByRole('button', { name: '3:4' }))
    expect(asStored(onChange.mock.calls[0]?.[0] as FormPatch, 'archRatio')).toEqual([
      { set: { 'pageBuilder[_key=="g1"].imageDesign.archRatio': '3/4' } },
    ])
  })

  it('changes nothing in read-only mode', () => {
    const onChange = renderArch('2/3', true)
    for (const button of screen.getAllByRole('button'))
      expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: ARCH_DEFAULT_CHOICE }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is drawn by Studio’s input router as the inherit-first choice', () => {
    const Routed = withPresetPicker(() => <div>fallback</div>)
    render(
      <ThemeProvider theme={theme}>
        <Routed {...(stringProps(undefined, vi.fn()) as unknown as InputProps)} />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: ARCH_DEFAULT_CHOICE })).toBeTruthy()
    expect(screen.queryByText('fallback')).toBeNull()
  })
})

describe('Allow frame overlap: a labelled button removes a saved true or false', () => {
  const renderOverlap = (value?: boolean, readOnly = false) => {
    const onChange: OnChange = vi.fn()
    render(
      <ThemeProvider theme={theme}>
        <ClearableBooleanInput {...booleanProps(value, onChange, readOnly)} />
      </ThemeProvider>,
    )
    return onChange
  }
  const clear = () =>
    screen.getByRole('button', { name: `Allow frame overlap: ${OVERLAP_DEFAULT_CHOICE}` })

  it.each([true, false])('unsets a saved %s, so the frame keeps its room', (saved) => {
    expect(fieldOf('frameOverlap').options?.clearable).toBe(OVERLAP_DEFAULT_CHOICE)
    const onChange = renderOverlap(saved)
    expect(clear().hasAttribute('disabled')).toBe(false)
    fireEvent.click(clear())
    expect(asStored(onChange.mock.calls[0]?.[0] as FormPatch, 'frameOverlap')).toEqual([
      { unset: ['pageBuilder[_key=="g1"].imageDesign.frameOverlap'] },
    ])
  })

  it('has nothing to clear while nothing is saved', () => {
    renderOverlap()
    expect(clear().hasAttribute('disabled')).toBe(true)
  })

  it('changes nothing in read-only mode', () => {
    const onChange = renderOverlap(false, true)
    expect(clear().hasAttribute('disabled')).toBe(true)
    fireEvent.click(clear())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is drawn by Studio’s input router as the clearable switch', () => {
    const Routed = withPresetPicker(() => <div>fallback</div>)
    render(
      <ThemeProvider theme={theme}>
        <Routed {...(booleanProps(true, vi.fn()) as unknown as InputProps)} />
      </ThemeProvider>,
    )
    expect(clear()).toBeTruthy()
    expect(screen.getByText('the switch')).toBeTruthy()
  })
})
