// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import type { FormPatch, ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveSectionEdge } from '@/components/ui/section-style'
import { resolveComposedEdge } from '@/lib/sanity/composed-edge'
import { edgeProblems, type EdgeDesign, type EdgeValue } from '@/lib/sanity/composed-edge-editor'

import { SectionEdgeInput } from './section-edge-input'

/** The site's saved designs, standing in for the Brand colours document: the fake client reads and writes it. */
const store: { designs: EdgeDesign[]; writes: string[] } = { designs: [], writes: [] }

vi.mock('sanity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  MemberField: () => null,
  useClient: () => ({
    fetch: (query: string) =>
      Promise.resolve(query.includes('coalesce') ? structuredClone(store.designs) : null),
    transaction() {
      const tx = {
        createIfNotExists: (document: { _id: string }) => (store.writes.push(document._id), tx),
        patch(id: string, build: (patch: unknown) => unknown) {
          const patch = {
            setIfMissing: () => patch,
            insert: (_at: string, _selector: string, items: EdgeDesign[]) => {
              store.designs.push(...structuredClone(items))
              return patch
            },
            unset: ([path]: string[]) => {
              const key = /_key=="(.+)"/.exec(path ?? '')?.[1]
              store.designs = store.designs.filter((design) => design._key !== key)
              return patch
            },
          }
          store.writes.push(id)
          build(patch)
          return tx
        },
        commit: () => Promise.resolve(undefined),
      }
      return tx
    },
  }),
}))

Element.prototype.scrollIntoView = vi.fn()
const theme = buildTheme()
afterEach(() => {
  cleanup()
  store.designs = []
  store.writes = []
})

/** One section's editor, with the value it would store, readable from outside. */
function Section({
  label,
  onValue,
}: {
  label: string
  onValue: (value: EdgeValue | undefined) => void
}) {
  const [value, setValue] = useState<unknown>(undefined)
  return (
    <section aria-label={label}>
      <SectionEdgeInput
        {...({
          value,
          readOnly: false,
          members: [],
          renderInput: () => null,
          renderField: () => null,
          renderItem: () => null,
          renderPreview: () => null,
          onChange: (event: FormPatch) => {
            const next =
              event.type === 'unset' ? undefined : (event as unknown as { value: EdgeValue }).value
            setValue(next)
            onValue(next)
          },
        } as unknown as ObjectInputProps)}
      />
    </section>
  )
}

describe('the Section edge walkthrough', () => {
  it('builds, saves as a design, applies to a second section, and customises the copy independently', async () => {
    const stored: Record<string, EdgeValue | undefined> = {}
    render(
      <ThemeProvider theme={theme}>
        <Section label="Section one" onValue={(v) => (stored.one = v)} />
        <Section label="Section two" onValue={(v) => (stored.two = v)} />
      </ThemeProvider>,
    )
    const one = within(screen.getByRole('region', { name: 'Section one' }))
    const two = within(screen.getByRole('region', { name: 'Section two' }))
    const keysOf = (v: EdgeValue) => [
      ...v.contour.points.map((p) => p._key),
      ...(v.layers ?? []).flatMap((l) => [l._key, ...(l.contour?.points ?? []).map((p) => p._key)]),
    ]

    // 1. Start, then combine layered contours, a gradient, partial width, a centre icon and a shadow.
    fireEvent.click(one.getByRole('button', { name: 'Start from the starting design' }))
    fireEvent.change(one.getByLabelText('Width of the artwork'), { target: { value: '70' } })
    fireEvent.click(one.getByRole('radio', { name: 'Icon' }))
    fireEvent.change(one.getByRole('combobox', { name: 'Icon' }), { target: { value: 'heart' } })
    fireEvent.change(one.getByLabelText('Shadow distance'), { target: { value: '14' } })
    fireEvent.click(
      within(one.getByRole('group', { name: 'Layer 1 paint' })).getByRole('radio', {
        name: 'Gradient',
      }),
    )
    const built = stored.one
    if (!built) throw new Error('nothing stored')
    expect(edgeProblems(built)).toEqual([])
    expect(built.layers?.[0]?.contour?.points).toHaveLength(3) // layered contours: the tint has its own
    expect(built.layers?.map((l) => l.paint?.kind)).toEqual(['gradient', 'gradient'])
    expect(built.width).toBe(70)
    expect(built.centre).toMatchObject({ kind: 'icon', icon: 'heart' })
    expect(built.shadow?.distance).toBe(14)
    const drawn = resolveComposedEdge(built)
    expect((drawn?.span.end ?? 0) - (drawn?.span.start ?? 0)).toBeCloseTo(0.7)
    expect(drawn?.centre?.kind).toBe('icon')

    // 2. Save it as a named design (an independent copy, written to the Brand colours draft).
    fireEvent.change(one.getByLabelText('Save this edge as a new design'), {
      target: { value: 'Sunrise ridge' },
    })
    fireEvent.click(one.getByRole('button', { name: 'Save copy as design' }))
    await waitFor(() => {
      expect(store.designs).toHaveLength(1)
    })
    expect(store.writes).toContain('drafts.designSettings')
    const design = store.designs[0]
    if (!design) throw new Error('no design')
    expect(design.name).toBe('Sunrise ridge')
    expect(keysOf(design.edge).filter((k) => keysOf(built).includes(k))).toEqual([])
    await waitFor(() => {
      expect(one.getByRole('status').textContent).toMatch(
        /Saved “Sunrise ridge”.*Publish Brand colours/,
      )
    })

    // 3. Apply it to another section: its settings are copied in.
    const pick = two.getByLabelText('Apply a saved design')
    fireEvent.focus(pick)
    await waitFor(() => {
      expect(within(pick).queryByRole('option', { name: 'Sunrise ridge' })).toBeTruthy()
    })
    fireEvent.change(pick, { target: { value: design._key } })
    fireEvent.click(two.getByRole('button', { name: 'Apply copy to this section' }))
    const copy = stored.two
    if (!copy) throw new Error('nothing applied')
    expect(copy.width).toBe(70)
    expect(copy.centre).toMatchObject({ icon: 'heart' })
    expect(keysOf(copy).filter((k) => keysOf(design.edge).includes(k))).toEqual([])
    expect(edgeProblems(copy)).toEqual([])

    // 4. Customise the copy: neither the design nor the first section changes.
    const designBefore = JSON.stringify(store.designs)
    const oneBefore = JSON.stringify(stored.one)
    fireEvent.click(two.getByRole('radio', { name: 'Small' }))
    fireEvent.change(two.getByLabelText('Shared contour, point 2 down'), { target: { value: '5' } })
    expect(stored.two?.height).toBe('small')
    expect(stored.two?.contour.points[1]?.y).toBe(5)
    expect(JSON.stringify(store.designs)).toBe(designBefore)
    expect(JSON.stringify(stored.one)).toBe(oneBefore)

    // 5. And the other way: editing the first section changes neither the copy nor the design.
    const twoBefore = JSON.stringify(stored.two)
    fireEvent.click(one.getByRole('radio', { name: 'Medium' }))
    expect(stored.one?.height).toBe('medium')
    expect(JSON.stringify(stored.two)).toBe(twoBefore)
    expect(JSON.stringify(store.designs)).toBe(designBefore)

    // 6. Undo steps back through the copy's own edits; Reset returns it to the starting design.
    fireEvent.click(two.getByRole('button', { name: 'Undo last change' }))
    expect(stored.two?.contour.points[1]?.y).toBe(42)
    fireEvent.click(two.getByRole('button', { name: 'Reset to the starting design' }))
    expect(stored.two?.width).toBe(100)
    expect(stored.two?.centre).toBeUndefined()

    // 7. Removing the custom edge hands the section back to its saved shape (a legacy edge still draws).
    fireEvent.click(two.getByRole('button', { name: 'Remove custom edge' }))
    expect(stored.two).toBeUndefined()
    expect(resolveSectionEdge({ edge: 'wave', composedEdge: built })?.shape).toBe('composed')
    expect(resolveSectionEdge({ edge: 'wave', composedEdge: stored.two })?.shape).toBe('wave')
  })

  it('deletes a design without touching sections that used it', async () => {
    const stored: Record<string, EdgeValue | undefined> = {}
    render(
      <ThemeProvider theme={theme}>
        <Section label="Only" onValue={(v) => (stored.only = v)} />
      </ThemeProvider>,
    )
    const only = within(screen.getByRole('region', { name: 'Only' }))
    fireEvent.click(only.getByRole('button', { name: 'Start from the starting design' }))
    fireEvent.change(only.getByLabelText('Save this edge as a new design'), {
      target: { value: 'Temp' },
    })
    fireEvent.click(only.getByRole('button', { name: 'Save copy as design' }))
    await waitFor(() => {
      expect(store.designs).toHaveLength(1)
    })
    const before = JSON.stringify(stored.only)
    fireEvent.click(only.getByRole('button', { name: 'Delete the design Temp' }))
    await waitFor(() => {
      expect(store.designs).toHaveLength(0)
    })
    expect(JSON.stringify(stored.only)).toBe(before)
  })
})
