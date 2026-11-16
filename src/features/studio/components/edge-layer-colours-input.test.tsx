// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  PatchEvent,
  toMutationPatches,
  type FormPatch,
  type InputProps,
  type ObjectInputProps,
  type StringInputProps,
} from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { sectionStyle } from '@/lib/sanity/schema/section-style'

import { EdgeLayerColoursInput, hasLayerOverrides } from './edge-layer-colours-input'
import { InheritableChoiceInput } from './inheritable-choice-input'
import { withPresetPicker } from './preset-picker/with-preset-picker'

/**
 * Clearing the section edge's per-layer colours in Studio (task 151, Slice 8). The real Studio's field menu offers
 * only Copy and Paste, so each colour and strength field clears through its own first choice ("Use recipe colour",
 * "Use Layer strength": InheritableChoiceInput, which unsets the field), and the group has one labelled button,
 * "Reset all layer overrides", that unsets the whole object. The controls are built from the real schema field
 * definitions, and the patches they emit are placed where Studio would place them (PatchEvent prefixes, then
 * toMutationPatches), so the tests show exactly which stored paths change.
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
const group = (sectionStyle.fields as unknown as (Field & { fields?: Field[] })[]).find(
  (field) => field.name === 'edgeLayerColours',
)
const fieldOf = (name: string): Field => {
  const field = group?.fields?.find((candidate) => candidate.name === name)
  if (!field) throw new Error(`No per-layer field named ${name}`)
  return field
}

type OnChange = ReturnType<typeof vi.fn<(patches: FormPatch | FormPatch[]) => void>>

/** One per-layer field as Studio renders it: its schema options, value and read-only state. */
function renderField(name: string, value?: string, readOnly = false) {
  const field = fieldOf(name)
  const onChange: OnChange = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <InheritableChoiceInput
        {...({
          schemaType: {
            name: field.name,
            title: field.title,
            jsonType: 'string',
            options: field.options,
          },
          value,
          onChange,
          readOnly,
          path: ['edgeLayerColours', name],
          elementProps: { id: name, ref: { current: null }, onFocus: vi.fn(), onBlur: vi.fn() },
        } as unknown as StringInputProps)}
      />
    </ThemeProvider>,
  )
  return onChange
}

/** The group as Studio renders it, its default fields stood in for. */
function renderGroup(value: Record<string, unknown> | undefined | null, readOnly = false) {
  const onChange: OnChange = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <EdgeLayerColoursInput
        {...({
          value,
          onChange,
          readOnly,
          schemaType: { name: 'edgeLayerColours', jsonType: 'object', options: group?.options },
          renderDefault: () => <div>the six fields</div>,
        } as unknown as ObjectInputProps)}
      />
    </ThemeProvider>,
  )
  return onChange
}

/** The patches as stored: prefixed by the field's place in a page's section style, then made into mutations. */
const SECTION = ['pageBuilder', { _key: 's1' }, 'style', 'edgeLayerColours'] as const
function asStored(patch: FormPatch | FormPatch[], field?: string) {
  let event = PatchEvent.from(patch)
  if (field) event = event.prefixAll(field)
  for (const segment of [...SECTION].reverse()) event = event.prefixAll(segment)
  return toMutationPatches(event.patches)
}

describe('a colour or strength field: its first choice clears it', () => {
  it('names the group by the field and offers “Use recipe colour” first, chosen while nothing is stored', () => {
    renderField('above1')
    const groupEl = screen.getByRole('group', { name: 'First layer above: colour' })
    const names = within(groupEl)
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(names).toEqual(['Use recipe colour', 'Primary', 'Secondary', 'Highlight', 'Text'])
    expect(
      screen.getByRole('button', { name: 'Use recipe colour' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('offers “Use Layer strength” first on a strength field', () => {
    renderField('belowStrength', 'strong')
    const groupEl = screen.getByRole('group', { name: 'Layer below: strength' })
    expect(
      within(groupEl)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Use Layer strength', 'Light', 'Standard', 'Strong'])
    expect(screen.getByRole('button', { name: 'Strong' }).getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('button', { name: 'Use Layer strength' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('clears a stored colour with one unset of that field only: no sentinel, the other fields untouched', () => {
    const onChange = renderField('above1', 'ink')
    fireEvent.click(screen.getByRole('button', { name: 'Use recipe colour' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const [patch] = onChange.mock.calls[0] ?? []
    expect(patch).toMatchObject({ type: 'unset', path: [] })
    expect(asStored(patch as FormPatch, 'above1')).toEqual([
      { unset: ['pageBuilder[_key=="s1"].style.edgeLayerColours.above1'] },
    ])
  })

  it('clears a strength on its own, leaving the colour of the same layer as it is', () => {
    const onChange = renderField('above1Strength', 'strong')
    fireEvent.click(screen.getByRole('button', { name: 'Use Layer strength' }))
    expect(asStored(onChange.mock.calls[0]?.[0] as FormPatch, 'above1Strength')).toEqual([
      { unset: ['pageBuilder[_key=="s1"].style.edgeLayerColours.above1Strength'] },
    ])
  })

  it('sets a choice as its stored value', () => {
    const onChange = renderField('below')
    fireEvent.click(screen.getByRole('button', { name: 'Primary' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'set', path: [], value: 'accent' }),
    )
  })

  it('uses native, focusable buttons, so Tab reaches them and Enter or Space chooses one', () => {
    renderField('above2', 'highlight')
    const clear = screen.getByRole('button', { name: 'Use recipe colour' })
    expect(clear.tagName).toBe('BUTTON')
    expect(clear.hasAttribute('disabled')).toBe(false)
    clear.focus()
    expect(document.activeElement).toBe(clear)
  })

  it('changes nothing in read-only mode: every choice is disabled', () => {
    const onChange = renderField('above1', 'ink', true)
    for (const button of screen.getAllByRole('button'))
      expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Use recipe colour' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('the group: Reset all layer overrides', () => {
  it('is a labelled button under the group’s own fields', () => {
    renderGroup({ above1: 'ink' })
    expect(screen.getByText('the six fields')).toBeTruthy()
    const reset = screen.getByRole('button', { name: 'Reset all layer overrides' })
    expect(reset.tagName).toBe('BUTTON')
    expect(reset.getAttribute('type')).toBe('button')
    reset.focus()
    expect(document.activeElement).toBe(reset)
  })

  it('unsets the whole object in one patch on its own path, so no sibling style setting can change', () => {
    const onChange = renderGroup({
      above1: 'ink',
      above2Strength: 'light',
      belowStrength: 'strong',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset all layer overrides' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const [patch] = onChange.mock.calls[0] ?? []
    expect(patch).toMatchObject({ type: 'unset', path: [] })
    // Stored: exactly one unset, of the group itself; edge, tone, depth and every other style field are not named.
    expect(asStored(patch as FormPatch)).toEqual([
      { unset: ['pageBuilder[_key=="s1"].style.edgeLayerColours'] },
    ])
  })

  it('is disabled while nothing is stored, empty strings and nulls included', () => {
    for (const value of [undefined, {}, { _type: 'object' }, { above1: '', belowStrength: null }]) {
      renderGroup(value)
      expect(
        screen.getByRole('button', { name: 'Reset all layer overrides' }).hasAttribute('disabled'),
      ).toBe(true)
      cleanup()
    }
    expect(hasLayerOverrides({ belowStrength: 'light' })).toBe(true)
  })

  it('is disabled in read-only mode, even with values stored, and emits nothing', () => {
    const onChange = renderGroup({ above1: 'ink' }, true)
    const reset = screen.getByRole('button', { name: 'Reset all layer overrides' })
    expect(reset.hasAttribute('disabled')).toBe(true)
    fireEvent.click(reset)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Studio’s input router', () => {
  const Fallback = () => <div>fallback</div>
  const Routed = withPresetPicker(Fallback)

  it('draws the group with its reset button, from the schema’s own option', () => {
    render(
      <ThemeProvider theme={theme}>
        <Routed
          {...({
            value: { above1: 'ink' },
            onChange: vi.fn(),
            readOnly: false,
            path: ['edgeLayerColours'],
            schemaType: { name: 'object', jsonType: 'object', options: group?.options, fields: [] },
            renderDefault: () => <div>the six fields</div>,
          } as unknown as InputProps)}
        />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Reset all layer overrides' })).toBeTruthy()
    expect(screen.queryByText('fallback')).toBeNull()
  })

  it('draws each per-layer field as the inherit-first choice, from the schema’s own option', () => {
    const field = fieldOf('below')
    render(
      <ThemeProvider theme={theme}>
        <Routed
          {...({
            value: undefined,
            onChange: vi.fn(),
            readOnly: false,
            path: ['edgeLayerColours', 'below'],
            schemaType: {
              name: 'string',
              title: field.title,
              jsonType: 'string',
              options: field.options,
            },
            elementProps: {
              id: 'below',
              ref: { current: null },
              onFocus: vi.fn(),
              onBlur: vi.fn(),
            },
          } as unknown as InputProps)}
        />
      </ThemeProvider>,
    )
    expect(screen.getByRole('button', { name: 'Use recipe colour' })).toBeTruthy()
  })
})
