// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { FormPatch } from 'sanity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FRAMING_RESOLVERS, type FrameShapes } from '@/lib/sanity/image-frame-geometry'
import { toCrop } from '@/lib/sanity/image-framing'

import { PictureFraming, type PictureFramingProps } from './picture-framing'

const theme = buildTheme()
const SIZE = { width: 4000, height: 3000 }
const SOURCE = {
  size: SIZE,
  previewUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
}
const [circle] = FRAMING_RESOLVERS.linkListProfile.resolve({})
const SHAPES = [circle] as FrameShapes
const PICTURE = { asset: { _ref: 'image-abc-4000x3000-jpg' } }

function setup(props: Partial<PictureFramingProps> = {}) {
  const onChange = vi.fn<(patches: FormPatch[]) => void>()
  const ui = (extra: Partial<PictureFramingProps> = {}): ReactElement => (
    <ThemeProvider theme={theme}>
      <PictureFraming
        value={PICTURE}
        shapes={SHAPES}
        source={SOURCE}
        onChange={onChange}
        {...props}
        {...extra}
      />
    </ThemeProvider>
  )
  const view = render(ui())
  return { onChange, view, ui }
}

const open = () => {
  fireEvent.click(screen.getByRole('button', { name: /adjust picture|view framing/i }))
  return screen.getByRole('dialog')
}
const found = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`Nothing matches ${selector}`)
  return element
}
const stage = () => found('[data-picture-stage]')
const slider = () => screen.getByRole<HTMLInputElement>('slider', { name: 'Zoom' })
const shapeBox = () => found('[data-picture-shape]')
const transformOf = () => shapeBox().querySelector('img')?.style.transform ?? ''
/** Lets the batched animation-frame update run. */
const frame = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(20)
  })

/** The patches as plain objects (Sanity tags each with a symbol). */
const plain = (patches: FormPatch[] | undefined) =>
  (patches ?? []).map(({ type, path, ...rest }) => ({
    type,
    path,
    ...('value' in rest ? { value: rest.value } : {}),
  }))

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the row under the image input', () => {
  it('offers Adjust picture and says the fit is automatic', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Adjust picture' })).toBeTruthy()
    expect(screen.getByText('Automatic fit')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull()
  })

  it('says Adjusted, with Reset, once a crop or hotspot is stored', () => {
    setup({ value: { ...PICTURE, hotspot: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 } } })
    expect(screen.getByText('Adjusted')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset picture positioning' })).toBeTruthy()
  })

  it('shows nothing without a picture', () => {
    const { view } = setup({ value: {} })
    expect(view.container.textContent).toBe('')
  })

  it('has no button for a logo, shown whole', () => {
    setup({ shapes: [] as unknown as FrameShapes })
    expect(screen.queryByRole('button', { name: /adjust picture/i })).toBeNull()
    expect(screen.getByText('Shown whole, so there’s nothing to adjust.')).toBeTruthy()
  })

  it('keeps a saved adjustment for a logo, with Reset', () => {
    const { onChange } = setup({
      shapes: [] as unknown as FrameShapes,
      value: { ...PICTURE, crop: { left: 0.1, right: 0.1, top: 0, bottom: 0 } },
    })
    expect(
      screen.getByText('Your image positioning is saved but isn’t applied in uncropped mode.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset picture positioning' }))
    expect(screen.getByText('Remove the saved positioning?')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(plain(onChange.mock.calls[0]?.[0])).toEqual([
      { type: 'unset', path: ['crop'] },
      { type: 'unset', path: ['hotspot'] },
    ])
  })

  it('asks before removing, and Keep changes nothing', () => {
    const { onChange } = setup({ value: { ...PICTURE, hotspot: { x: 0.5, y: 0.5 } } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset picture positioning' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText('Remove the saved positioning?')).toBeNull()
  })
})

describe('the dialog', () => {
  it('moves focus in, closes on Escape and returns focus to the button', () => {
    setup()
    const button = screen.getByRole('button', { name: 'Adjust picture' })
    const dialog = open()
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('names the stage and explains its keys', () => {
    setup()
    open()
    const description = document.getElementById(stage().getAttribute('aria-describedby') ?? '')
    expect(stage().getAttribute('aria-label')).toBe('Picture position')
    expect(description?.textContent).toContain('Arrow keys move the picture')
    expect(screen.getByText('Drag to reposition. Use the slider to zoom.')).toBeTruthy()
  })

  it('moves the picture with the arrow keys and the Move buttons', async () => {
    setup()
    open()
    const start = transformOf()
    fireEvent.keyDown(stage(), { key: 'ArrowRight' })
    await frame()
    const afterKey = transformOf()
    // At zoom 1 the cover box fills one axis, so only the loose axis moves.
    expect(afterKey).not.toBe(start)
    fireEvent.click(screen.getByRole('button', { name: 'Move picture left' }))
    expect(transformOf()).toBe(start)
  })

  it('moves further with Shift', async () => {
    setup()
    open()
    fireEvent.keyDown(stage(), { key: 'ArrowRight' })
    await frame()
    const small = transformOf()
    fireEvent.keyDown(stage(), { key: 'ArrowRight', shiftKey: true })
    await frame()
    expect(transformOf()).not.toBe(small)
  })

  it('zooms with the slider, the buttons and the keys, with matching values', async () => {
    setup()
    open()
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 100%')
    fireEvent.change(slider(), { target: { value: '150' } })
    expect(slider().value).toBe('150')
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 150%')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 155%')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 145%')
    fireEvent.keyDown(stage(), { key: '+' })
    await frame()
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 150%')
    fireEvent.keyDown(stage(), { key: '0' })
    expect(slider().getAttribute('aria-valuetext')).toBe('Zoom 100%')
  })

  it('pinches to zoom with two pointers', async () => {
    setup()
    open()
    shapeBox().getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 300, right: 300, bottom: 300 }) as DOMRect
    fireEvent.pointerDown(stage(), {
      pointerId: 1,
      clientX: 100,
      clientY: 150,
      pointerType: 'touch',
    })
    fireEvent.pointerDown(stage(), {
      pointerId: 2,
      clientX: 200,
      clientY: 150,
      pointerType: 'touch',
    })
    fireEvent.pointerMove(stage(), {
      pointerId: 2,
      clientX: 260,
      clientY: 150,
      pointerType: 'touch',
    })
    await frame()
    expect(Number(slider().value)).toBeGreaterThan(100)
    fireEvent.pointerUp(stage(), { pointerId: 2, pointerType: 'touch' })
    fireEvent.pointerUp(stage(), { pointerId: 1, pointerType: 'touch' })
  })

  it('zooms on ctrl + wheel, and leaves a plain wheel to scroll', async () => {
    setup()
    open()
    const plain = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    act(() => {
      stage().dispatchEvent(plain)
    })
    expect(plain.defaultPrevented).toBe(false)
    const pinch = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      stage().dispatchEvent(pinch)
    })
    await frame()
    expect(pinch.defaultPrevented).toBe(true)
    expect(Number(slider().value)).toBeGreaterThan(100)
  })

  it('notes softness at the soft limit', () => {
    setup({ source: { ...SOURCE, size: { width: 600, height: 450 } } })
    open()
    expect(screen.queryByText('Zooming further may make the picture look soft.')).toBeNull()
    fireEvent.change(slider(), { target: { value: '200' } })
    expect(screen.getByText('Zooming further may make the picture look soft.')).toBeTruthy()
  })

  it('announces a change politely, after a pause', async () => {
    setup()
    open()
    const live = screen.getByRole('status')
    fireEvent.change(slider(), { target: { value: '150' } })
    expect(live.textContent).toBe('')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(live.textContent).toBe('Zoom 150%')
  })
})

describe('Apply, Reset and Cancel', () => {
  it('sends exactly one change with crop and hotspot on Apply', () => {
    const { onChange } = setup()
    open()
    fireEvent.change(slider(), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const patches = plain(onChange.mock.calls[0]?.[0])
    expect(patches.map((patch) => patch.path)).toEqual([['crop'], ['hotspot']])
    const expected = toCrop({ asset: SIZE, aspect: 1, zoom: 2, centre: { x: 0.5, y: 0.5 } })
    expect(patches).toEqual([
      { type: 'set', path: ['crop'], value: expected.crop },
      { type: 'set', path: ['hotspot'], value: expected.hotspot },
    ])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sends nothing on Cancel, even after a change', () => {
    const { onChange } = setup()
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks "Discard changes?" only after a change', () => {
    const { onChange } = setup()
    open()
    fireEvent.change(slider(), { target: { value: '130' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByText('Discard changes?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByText('Discard changes?')).toBeNull()
    expect(slider().value).toBe('130')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sends no change when nothing was moved', () => {
    const { onChange } = setup()
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Reset returns to the automatic fit, and Apply then unsets both values', () => {
    const stored = toCrop({ asset: SIZE, aspect: 1, zoom: 2, centre: { x: 0.4, y: 0.5 } })
    const { onChange } = setup({ value: { ...PICTURE, ...stored } })
    open()
    expect(slider().value).toBe('200')
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(slider().value).toBe('100')
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(plain(onChange.mock.calls[0]?.[0])).toEqual([
      { type: 'unset', path: ['crop'] },
      { type: 'unset', path: ['hotspot'] },
    ])
  })

  it('opens where the picture was left', () => {
    const stored = toCrop({ asset: SIZE, aspect: 1, zoom: 2.5, centre: { x: 0.6, y: 0.4 } })
    setup({ value: { ...PICTURE, ...stored } })
    open()
    expect(slider().value).toBe('250')
  })
})

describe('read-only', () => {
  it('offers View framing and a dialog without controls', () => {
    const { onChange } = setup({ readOnly: true })
    const dialog = open()
    expect(screen.queryByRole('slider')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Apply' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /move picture/i })).toBeNull()
    expect(stage().getAttribute('tabindex')).toBeNull()
    fireEvent.keyDown(stage(), { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('a picture that will not load', () => {
  it('says so, with Try again', () => {
    setup()
    open()
    fireEvent.error(found('[data-picture-shape] img'))
    expect(screen.getByText('The picture couldn’t load')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByText('The picture couldn’t load')).toBeNull()
    expect(stage()).toBeTruthy()
  })
})
