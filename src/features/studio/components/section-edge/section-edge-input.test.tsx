// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import type { FormPatch, ObjectInputProps, PatchEvent } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveComposedEdge } from '@/lib/sanity/composed-edge'
import { edgeProblems, startingEdge, type EdgeValue } from '@/lib/sanity/composed-edge-editor'

import { SectionEdgeInput } from './section-edge-input'

vi.mock('sanity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useClient: () => ({
    fetch: () => Promise.resolve([]),
    transaction: () => {
      throw new Error('no writes in this test')
    },
  }),
  MemberField: () => null,
}))

const theme = buildTheme()
afterEach(cleanup)
// jsdom has no layout, so no scrolling.
Element.prototype.scrollIntoView = vi.fn()

/** Applies the editor's patches the way Studio would: `set` replaces the object, `unset` clears it. */
function Harness({ initial, onValue }: { initial?: unknown; onValue: (v: unknown) => void }) {
  const [value, setValue] = useState<unknown>(initial)
  const onChange = (event: FormPatch | FormPatch[] | PatchEvent) => {
    const patch = (Array.isArray(event) ? event[0] : event) as FormPatch
    const next = patch.type === 'unset' ? undefined : (patch as { value: unknown }).value
    setValue(next)
    onValue(next)
  }
  return (
    <ThemeProvider theme={theme}>
      <SectionEdgeInput
        {...({
          value,
          onChange,
          readOnly: false,
          members: [],
          renderInput: () => null,
          renderField: () => null,
          renderItem: () => null,
          renderPreview: () => null,
        } as unknown as ObjectInputProps)}
      />
    </ThemeProvider>
  )
}

const mount = (initial?: unknown) => {
  const seen: unknown[] = []
  render(<Harness initial={initial} onValue={(v) => seen.push(v)} />)
  return seen
}
const last = (seen: unknown[]) => seen.at(-1) as EdgeValue | undefined

describe('starting', () => {
  it('shows only the start button and the saved-shape note while nothing is stored', () => {
    mount()
    expect(screen.getByText(/uses its Bottom edge choice/)).toBeTruthy()
    expect(screen.queryByRole('radio', { name: /Transition/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Undo last change' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('starts from a strong design that the page resolver draws', () => {
    const seen = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start from the starting design' }))
    const value = last(seen)
    expect(resolveComposedEdge(value)?.layers.length).toBe(2)
    expect(edgeProblems(value)).toEqual([])
    expect(screen.getByText(/Transition · Large · 2 layers · shadow/)).toBeTruthy()
  })
})

describe('editing', () => {
  const started = () => startingEdge()

  it('changes the height with one patch and keeps the edge drawable', () => {
    const seen = mount(started())
    fireEvent.click(screen.getByRole('radio', { name: 'Small' }))
    expect(last(seen)?.height).toBe('small')
    expect(resolveComposedEdge(last(seen))?.height.size).toBe('small')
  })

  it('shows Where the artwork sits only once the width is under 100%', () => {
    mount(started())
    expect(screen.queryByText('Where the artwork sits')).toBeNull()
    fireEvent.change(screen.getByLabelText('Width of the artwork'), { target: { value: '60' } })
    expect(screen.getByText('Where the artwork sits')).toBeTruthy()
  })

  it('moves a contour point with the arrow keys, 1% and Shift 5%, and keeps the end pinned', () => {
    const seen = mount(started())
    const handle = screen.getAllByRole('slider', { name: /Shared contour, point 2 of 4/ })[0]
    if (!handle) throw new Error('no handle')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(last(seen)?.contour.points[1]?.x).toBe(33)
    fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true })
    expect(last(seen)?.contour.points[1]?.y).toBe(47)
    const first = screen.getAllByRole('slider', { name: /Shared contour, point 1 of 4/ })[0]
    if (!first) throw new Error('no first handle')
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(last(seen)?.contour.points[0]?.x).toBe(0)
  })

  it('does everything a drag does with numbers and buttons: edit, add and remove a point', () => {
    const seen = mount(started())
    fireEvent.change(screen.getByLabelText('Shared contour, point 2 down'), {
      target: { value: '10' },
    })
    expect(last(seen)?.contour.points[1]?.y).toBe(10)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a point' })[0] ?? document.body)
    expect(last(seen)?.contour.points).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Shared contour point 2' }))
    expect(last(seen)?.contour.points).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Remove Shared contour point 1' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('adds layers up to three, then says why not', () => {
    const seen = mount(started())
    fireEvent.click(screen.getByRole('button', { name: 'Add a paint layer' }))
    expect(last(seen)?.layers).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Add a paint layer' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByText(/at most 3 paint layers/)).toBeTruthy()
  })

  it('keeps shadow depth and a layer’s vertical offset as separate controls', () => {
    const seen = mount(started())
    fireEvent.change(screen.getByLabelText('Layer 1 vertical offset'), { target: { value: '12' } })
    expect(last(seen)?.layers?.[0]?.offsetY).toBe(12)
    expect(last(seen)?.shadow).toEqual({ blur: 6, distance: 8, opacity: 28 })
    fireEvent.change(screen.getByLabelText('Shadow distance'), { target: { value: '20' } })
    expect(last(seen)?.shadow?.distance).toBe(20)
    expect(last(seen)?.layers?.[0]?.offsetY).toBe(12)
  })

  it('offers a centre icon, and no shadow controls for a rule', () => {
    const seen = mount(started())
    fireEvent.click(screen.getByRole('radio', { name: 'Icon' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Icon' }), { target: { value: 'heart' } })
    expect(last(seen)?.centre).toMatchObject({ kind: 'icon', icon: 'heart' })
    expect(resolveComposedEdge(last(seen))?.centre?.kind).toBe('icon')
    fireEvent.click(screen.getByRole('radio', { name: /Rule/ }))
    expect(screen.getByText('A rule has no shadow.')).toBeTruthy()
    expect(screen.queryByLabelText('Shadow distance')).toBeNull()
  })

  it('undoes the last change, then the one before, then has nothing left to undo', () => {
    const seen = mount(started())
    fireEvent.click(screen.getByRole('radio', { name: 'Small' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Medium' }))
    const undo = screen.getByRole('button', { name: 'Undo last change' })
    fireEvent.click(undo)
    expect(last(seen)?.height).toBe('small')
    fireEvent.click(undo)
    expect(last(seen)?.height).toBe('large')
    expect(undo).toHaveProperty('disabled', true)
  })

  it('resets to the starting design, and removing clears the field', () => {
    const seen = mount({ ...started(), height: 'small', shadow: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Reset to the starting design' }))
    expect(last(seen)?.height).toBe('large')
    fireEvent.click(screen.getByRole('button', { name: 'Remove custom edge' }))
    expect(last(seen)).toBeUndefined()
  })
})

describe('a stored edge that cannot draw', () => {
  const broken = { ...startingEdge(), version: 2 }

  it('says so, names the fix, and the fix is a control on the page', () => {
    mount(broken)
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(/page uses the Bottom edge choice instead/)).toBeTruthy()
    expect(within(alert).getByText(/different version/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset to the starting design' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove custom edge' })).toBeTruthy()
  })

  it('every problem’s control exists, or falls back to Reset, which does', () => {
    mount({ ...startingEdge(), contour: { points: [{ x: 0, y: 1 }] } })
    const go = screen.getByRole('button', { name: 'Go to the fix' })
    fireEvent.click(go)
    expect(document.activeElement?.closest('[data-edge-control="reset"]')).toBeTruthy()
  })

  it('does not offer to save a design that does not draw', () => {
    mount(broken)
    expect(screen.getByRole('button', { name: 'Save copy as design' })).toHaveProperty(
      'disabled',
      true,
    )
  })
})
