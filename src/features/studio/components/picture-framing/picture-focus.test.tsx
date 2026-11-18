// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { FormPatch } from 'sanity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverPosition, FOCUS_FRAMES } from '@/lib/sanity/image-focus'
import { FRAMING_RESOLVERS } from '@/lib/sanity/image-frame-geometry'

import { PictureFocus, type PictureFocusProps } from './picture-focus'

/**
 * Focus mode for a picture that covers its background (task 177): the row under the image field, and the dialog.
 * It writes the hotspot and nothing else; Reset removes only the hotspot; the frames use the page's own answer.
 */

const theme = buildTheme()
const SOURCE = { previewUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', aspect: 2 }
const PLAN = { label: 'Text over media background', frames: FOCUS_FRAMES }
const CROP = { _type: 'sanity.imageCrop' as const, top: 0, bottom: 0, left: 0.1, right: 0.1 }
const HOTSPOT = { _type: 'sanity.imageHotspot', x: 0.3, y: 0.5, width: 0.4, height: 0.2 }
const ASSET = { _ref: 'image-abc-4000x2000-jpg' }

/** The patches as plain objects (Sanity tags each with a symbol). */
const plain = (patches: FormPatch[] | undefined) =>
  (patches ?? []).map(({ type, path, ...rest }) => ({
    type,
    path,
    ...('value' in rest ? { value: rest.value } : {}),
  }))

function setup(props: Partial<PictureFocusProps> = {}) {
  const onChange = vi.fn<(patches: FormPatch[]) => void>()
  render(
    <ThemeProvider theme={theme}>
      <PictureFocus
        value={{ asset: ASSET }}
        plan={PLAN}
        source={SOURCE}
        onChange={onChange}
        {...props}
      />
    </ThemeProvider>,
  )
  return { onChange }
}

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: /^(focus|view focus)$/i }))
  return screen.getByRole('dialog')
}

/** A stage at 400 x 200 on screen, so a click's position is its fraction of the picture. */
function sizeStage() {
  const stage = stageElement()
  stage.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0 }) as DOMRect
  stage.setPointerCapture = vi.fn()
  return stage
}
/** The element a selector names, which must be on screen. */
const found = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`Nothing matches ${selector}`)
  return element
}
const foundAll = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const stageElement = () => found('[data-focus-stage]')
const clickAt = (x: number, y: number) => {
  const stage = sizeStage()
  fireEvent.pointerDown(stage, { clientX: x, clientY: y, pointerId: 1 })
  fireEvent.pointerUp(stage, { pointerId: 1 })
}
const positions = () => foundAll('[data-focus-frame] img').map((img) => img.style.objectPosition)

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the Focus row', () => {
  it('offers Focus in place of Adjust picture, and says the picture is centred until a focus is set', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Focus' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /adjust picture/i })).toBeNull()
    expect(screen.getByText('Centred')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reset picture focus' })).toBeNull()
  })

  it('shows nothing before a picture is chosen', () => {
    setup({ value: undefined })
    expect(screen.queryByRole('button', { name: 'Focus' })).toBeNull()
  })

  it('removes only the hotspot on Reset, after asking, and leaves the crop', () => {
    const { onChange } = setup({ value: { asset: ASSET, crop: CROP, hotspot: HOTSPOT } })
    expect(screen.getByText('Focus set')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset picture focus' }))
    expect(screen.getByRole('alert').textContent).toBe('Remove the saved focus?')
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reset picture focus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(plain(onChange.mock.calls[0]?.[0])).toEqual([{ type: 'unset', path: ['hotspot'] }])
  })

  it('is view-only when the field is read-only: no Reset, and the dialog changes nothing', () => {
    const { onChange } = setup({
      value: { asset: ASSET, crop: CROP, hotspot: HOTSPOT },
      readOnly: true,
    })
    expect(screen.queryByRole('button', { name: 'Reset picture focus' })).toBeNull()
    const dialog = openDialog()
    expect(within(dialog).queryByRole('button', { name: 'Apply' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(within(dialog).queryByRole('group', { name: 'Move focus' })).toBeNull()
    clickAt(40, 40)
    fireEvent.keyDown(stageElement(), {
      key: 'ArrowRight',
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(positions()).toEqual(['25% 50%', '25% 50%', '25% 50%'])
  })
})

describe('the Focus dialog', () => {
  it('previews the picture in the phone, tablet and desktop frames, centred until a point is chosen', () => {
    setup()
    openDialog()
    const frames = foundAll('[data-focus-frame]').map((frame) =>
      frame.getAttribute('data-focus-frame'),
    )
    expect(frames).toEqual(['Phone', 'Tablet', 'Desktop'])
    expect(positions()).toEqual(['', '', ''])
  })

  it('moves every frame to the chosen point, by the page’s own position', () => {
    setup({ value: { asset: ASSET, crop: CROP } })
    openDialog()
    clickAt(100, 50) // a quarter across and down the picture as served
    // The page's answer for the hotspot this stores: measured on the picture the CDN serves (cut to the crop).
    const expected = coverPosition({
      crop: CROP,
      hotspot: {
        _type: 'sanity.imageHotspot',
        x: 0.1 + 0.25 * 0.8,
        y: 0.25,
        width: 0.3,
        height: 0.3,
      },
    })
    expect(expected).toBe('25% 25%')
    expect(positions()).toEqual([expected, expected, expected])
  })

  it('writes the hotspot only, whole-picture coordinates, keeping a stored hotspot’s size', () => {
    const { onChange } = setup({ value: { asset: ASSET, crop: CROP, hotspot: HOTSPOT } })
    openDialog()
    clickAt(200, 100) // the centre of the served picture: the centre of the crop, x .5
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(plain(onChange.mock.calls[0]?.[0])).toEqual([
      {
        type: 'set',
        path: ['hotspot'],
        value: { _type: 'sanity.imageHotspot', x: 0.5, y: 0.5, width: 0.4, height: 0.2 },
      },
    ])
    // One change, and never the crop, the asset or the alt text.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(plain(onChange.mock.calls[0]?.[0]))).not.toMatch(/crop|asset|alt/)
  })

  it('moves the focus with the arrow keys and the buttons, a step at a time', () => {
    const { onChange } = setup({ value: { asset: ASSET, hotspot: { ...HOTSPOT, x: 0.5, y: 0.5 } } })
    openDialog()
    const stage = stageElement()
    fireEvent.keyDown(stage, { key: 'ArrowRight' })
    fireEvent.keyDown(stage, { key: 'ArrowDown', shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: 'Move focus left' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    // +2% across, +10% down, then -2% across.
    expect(
      plain(onChange.mock.calls[0]?.[0]).map((patch) => 'value' in patch && patch.value),
    ).toEqual([{ _type: 'sanity.imageHotspot', x: 0.5, y: 0.6, width: 0.4, height: 0.2 }])
  })

  it('Reset in the dialog goes back to centred and Apply removes only the hotspot', () => {
    const { onChange } = setup({ value: { asset: ASSET, crop: CROP, hotspot: HOTSPOT } })
    const dialog = openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))
    expect(positions()).toEqual(['', '', ''])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(plain(onChange.mock.calls[0]?.[0])).toEqual([{ type: 'unset', path: ['hotspot'] }])
  })

  it('writes nothing when nothing changed, and asks before discarding a change', () => {
    const { onChange } = setup({ value: { asset: ASSET, hotspot: HOTSPOT } })
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }))
    clickAt(20, 20)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alert').textContent).toBe('Discard changes?')
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('names the point in words and gives the stage a keyboard-reachable group', () => {
    setup({ value: { asset: ASSET, hotspot: HOTSPOT } })
    openDialog()
    expect(screen.getByRole('group', { name: 'Focus point' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByText(/Focus 30% across, 50% down/)).toBeTruthy()
  })
})

describe('where Focus mode is offered', () => {
  const { focus, resolve } = FRAMING_RESOLVERS.mediaTextImage
  const legacy = FRAMING_RESOLVERS.mediaTextLegacyImage

  it('is the Text over media layout only: Side and Stacked keep their fixed shapes', () => {
    expect(focus?.({ variant: 'overlay' })?.label).toBe('Text over media background')
    expect(focus?.({ variant: 'overlay' })?.frames.map((frame) => frame.label)).toEqual([
      'Phone',
      'Tablet',
      'Desktop',
    ])
    for (const variant of ['side', 'stacked', undefined]) {
      expect(focus?.({ variant })).toBeUndefined()
      expect(resolve({ variant })).toHaveLength(1)
    }
    expect(resolve({ variant: 'overlay' })).toEqual([])
    // The older picture field is the background in the same layout.
    expect(legacy.focus?.({ variant: 'overlay' })).toBeDefined()
    expect(legacy.focus?.({ variant: 'side' })).toBeUndefined()
  })
})
