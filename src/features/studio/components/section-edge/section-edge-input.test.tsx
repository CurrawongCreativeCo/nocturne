// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import type { FormPatch, ObjectInputProps, PatchEvent } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { colorHex } from '@/config/tokens.generated'
import { resolveComposedEdge } from '@/lib/sanity/composed-edge'
import {
  edgeProblems,
  startingEdge,
  startingRule,
  type EdgeValue,
} from '@/lib/sanity/composed-edge-editor'

import { SectionEdgeInput } from './section-edge-input'

// One client for the file, as Studio's useClient gives (a new one per render re-runs the design bar's load effect).
const cache = vi.hoisted(
  (): {
    client?: object
    /** The document Studio would give `useFormValue([])`; a test sets it, and it is cleared after each. */
    document?: unknown
  } => ({}),
)

vi.mock('sanity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useClient: () =>
    (cache.client ??= {
      fetch: () => Promise.resolve([]),
      transaction: () => {
        throw new Error('no writes in this test')
      },
    }),
  MemberField: () => null,
  useFormValue: () => cache.document,
}))

const theme = buildTheme()
afterEach(() => {
  cleanup()
  cache.document = undefined
})
// jsdom has no layout, so no scrolling.
Element.prototype.scrollIntoView = vi.fn()

/** Applies the editor's patches the way Studio would: `set` replaces the object, `unset` clears it. */
function Harness({
  initial,
  onValue,
  path,
}: {
  initial?: unknown
  onValue: (v: unknown) => void
  path?: unknown[]
}) {
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
          path,
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
/** The newest written value; a test that expects a write fails here when there was none. */
const written = (seen: unknown[]): EdgeValue => {
  const value = last(seen)
  if (!value) throw new Error('The editor wrote nothing.')
  return value
}

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

/** The previews on the page, found by their accessible name. */
const previews = () => screen.queryAllByRole('img', { name: /Preview of the edge/ })
/** The dashed marker for a centre opening (the only span inside a preview). */
/** The icon drawn inside the preview's centre opening, if any. */
const previewIcon = () =>
  [...(previews()[0]?.getElementsByTagName('svg') ?? [])].find((svg) =>
    svg.hasAttribute('data-edge-preview-icon'),
  )
const centreMarker = () => previews()[0]?.getElementsByTagName('span')[0] ?? null

describe('the preview', () => {
  const REF = 'image-0123456789abcdef0123456789abcdef01234567-640x480-jpg'
  const withImage = (asset: unknown) => ({
    ...startingEdge(),
    centre: { kind: 'image', gap: 30, image: { _type: 'image', asset } },
  })

  it('opens the gap for a real selected picture (Studio’s _ref) and closes it for an unavailable one', () => {
    const { unmount } = render(
      <ThemeProvider theme={theme}>
        <div data-testid="a">
          <SectionEdgeInput {...propsFor(withImage({ _type: 'reference', _ref: REF }))} />
        </div>
      </ThemeProvider>,
    )
    expect(centreMarker()).toBeTruthy()
    unmount()
    render(
      <ThemeProvider theme={theme}>
        <SectionEdgeInput {...propsFor(withImage({ _type: 'reference', _ref: 'missing' }))} />
      </ThemeProvider>,
    )
    expect(previews()).toHaveLength(1)
    expect(centreMarker()).toBeNull()
  })

  it('gives each preview its own definition ids, so two on a page draw independently', () => {
    render(
      <ThemeProvider theme={theme}>
        <SectionEdgeInput {...propsFor(startingEdge())} />
        <SectionEdgeInput {...propsFor(startingEdge())} />
      </ThemeProvider>,
    )
    const ids = previews().flatMap((preview) =>
      [...preview.querySelectorAll('[id]')].map((el) => el.id),
    )
    expect(ids.length).toBeGreaterThan(6)
    expect(new Set(ids).size).toBe(ids.length)
    // Every reference points at an id that exists in its own preview.
    for (const preview of previews()) {
      const own = new Set([...preview.querySelectorAll('[id]')].map((el) => el.id))
      const used = [...preview.innerHTML.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? '')
      expect(used.length).toBeGreaterThan(0)
      for (const id of used) expect(own.has(id)).toBe(true)
    }
  })
})

function propsFor(value: unknown): ObjectInputProps {
  return {
    value,
    onChange: vi.fn(),
    readOnly: false,
    members: [],
    renderInput: () => null,
    renderField: () => null,
    renderItem: () => null,
    renderPreview: () => null,
  } as unknown as ObjectInputProps
}

describe('the empty state', () => {
  it('says there is no custom edge yet, not that something needs fixing', () => {
    mount()
    expect(
      screen.getByRole('img', { name: /There is no custom edge|no custom edge/i }),
    ).toBeTruthy()
    expect(screen.queryByText(/problems below/)).toBeNull()
  })

  it('still says to fix the problems when a stored edge cannot draw', () => {
    mount({ version: 1, mode: 'rule', contour: { points: [] } })
    expect(screen.getByText(/Nothing to preview until the problems below are fixed/)).toBeTruthy()
  })
})

describe('starting a straight rule', () => {
  it('writes the rule starter from its own button, with no shadow, no centre and a flat contour', () => {
    const seen = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start a straight rule' }))
    const value = written(seen)
    expect(value.mode).toBe('rule')
    expect(value.shadow).toBeUndefined()
    expect(value.centre).toBeUndefined()
    expect(new Set(value.contour.points.map((p) => p.y)).size).toBe(1)
    expect(resolveComposedEdge(value)?.mode).toBe('rule')
  })

  it('keeps every authored contour and layer when switching between transition and rule', () => {
    const before = startingEdge()
    const seen = mount(before)
    fireEvent.click(screen.getByRole('radio', { name: /^Rule/ }))
    const rule = written(seen)
    expect(rule.mode).toBe('rule')
    expect(rule.contour).toEqual(before.contour)
    expect(rule.layers).toHaveLength(2)
    fireEvent.click(screen.getByRole('radio', { name: /^Transition/ }))
    const back = written(seen)
    expect(back.mode).toBe('transition')
    expect(back.contour).toEqual(rule.contour)
    expect(back.layers).toEqual(rule.layers)
  })

  it('offers to straighten a wavy contour in a rule, and only changes the contour', () => {
    const wavy: EdgeValue = { ...startingEdge(), mode: 'rule' }
    const seen = mount(wavy)
    fireEvent.click(screen.getByRole('button', { name: 'Straighten the contour' }))
    const next = written(seen)
    expect(new Set(next.contour.points.map((p) => p.y)).size).toBe(1)
    expect(next.contour.points.map((p) => p.x)).toEqual(wavy.contour.points.map((p) => p.x))
    expect(next.layers).toEqual(wavy.layers)
    // Once it is straight the button goes away.
    expect(screen.queryByRole('button', { name: 'Straighten the contour' })).toBeNull()
  })

  it('does not offer it for a transition', () => {
    mount(startingEdge())
    expect(screen.queryByRole('button', { name: 'Straighten the contour' })).toBeNull()
  })
})

describe('the centre icon', () => {
  const withIcon = (icon?: string): EdgeValue => ({
    ...startingRule(),
    centre: { kind: 'icon', gap: 20, ...(icon ? { icon } : {}) },
  })

  it('draws the chosen icon inside the opening in the preview', () => {
    mount(withIcon('lotus'))
    expect(previewIcon()?.getAttribute('data-edge-preview-icon')).toBe('lotus')
  })

  it('draws no icon and says to choose one while none is chosen', () => {
    mount(withIcon())
    expect(previewIcon()).toBeUndefined()
    expect(screen.getByText('Choose an icon, or the artwork draws without a centre.')).toBeTruthy()
  })

  it('talks about the icon, not a picture, once an icon is chosen', () => {
    mount(withIcon('lotus'))
    expect(
      screen.getByText('If the icon is unavailable, the artwork draws without a centre.'),
    ).toBeTruthy()
    expect(screen.queryByText(/picture is missing/)).toBeNull()
  })

  it('keeps the picture wording for a picture centre', () => {
    mount({ ...startingRule(), centre: { kind: 'image', gap: 20 } })
    expect(
      screen.getByText('If the picture is missing, the artwork draws without a centre.'),
    ).toBeTruthy()
  })
})

describe('the summary', () => {
  it('describes a rule as drawn: no shadow, and a centre without an icon is not drawn', () => {
    mount({
      ...startingEdge(),
      mode: 'rule',
      centre: { kind: 'icon', gap: 20 },
    })
    const summary = screen.getByText(/^Rule · /).textContent
    expect(summary).toContain('Rule')
    expect(summary).not.toContain('shadow')
    expect(summary).toContain('centre icon not drawn')
  })
})

describe("the preview's colours", () => {
  const doc = {
    pageBuilder: [
      { _key: 'one', style: { tone: 'inverse' } },
      { _key: 'two', style: { tone: 'alt' } },
    ],
  }

  it("uses the section's own background and the next section's when the editor has them", () => {
    cache.document = doc
    render(
      <Harness
        initial={startingEdge()}
        onValue={() => undefined}
        path={['pageBuilder', { _key: 'one' }, 'style', 'composedEdge']}
      />,
    )
    const fills = [...(previews()[0]?.querySelectorAll('rect, path') ?? [])].map((el) =>
      el.getAttribute('fill'),
    )
    expect(fills).toContain(colorHex.surfaceInverse)
    expect(fills).toContain(colorHex.surfaceAlt)
  })

  it('keeps the template defaults when there is no document', () => {
    mount(startingEdge())
    const fills = [...(previews()[0]?.querySelectorAll('rect, path') ?? [])].map((el) =>
      el.getAttribute('fill'),
    )
    expect(fills).toContain(colorHex.surface)
  })
})

describe('slider names', () => {
  it('names every slider: range inputs by a visible label, contour points by an aria-label', () => {
    mount(startingEdge())
    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBeGreaterThan(4)
    for (const slider of sliders) {
      const label = slider.id
        ? document.querySelector(`label[for="${CSS.escape(slider.id)}"]`)?.textContent
        : undefined
      const name = label ?? slider.getAttribute('aria-label')
      expect(name && name.trim().length > 0).toBe(true)
    }
  })
})
