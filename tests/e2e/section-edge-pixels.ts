import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Reading what a browser paints at a section edge, for the specs that check the layers drawn there (task
 * 151, Slice 3). Every colour is read the way the browser paints it: a computed colour is converted to sRGB
 * by the browser, and a pixel is read from a screenshot. Lengths are in band units: x across the frame, y from
 * the top of the band (0) to the section's bottom (1).
 */

/** Within this many steps per channel: a screenshot's rounding and colour conversion. */
export const TOLERANCE = 4

export const section = (page: Page, id: string) => page.locator(`section#${id}`)
export const frameOf = (page: Page, id: string) => section(page, id).locator('xpath=..')
export const part = (page: Page, id: string, name: string) =>
  frameOf(page, id).locator(`[data-edge-part="${name}"] path`)

/**
 * A colour the browser computes for `property` (on `el`, or on a probe inside it that takes `role` as its
 * text colour), as the sRGB a screenshot holds: painted onto a canvas and read back.
 */
const computedSrgb = (el: Element, [property, role]: [string, string | null]) => {
  let target = el
  if (role) {
    target = document.createElement('span')
    ;(target as HTMLElement).style.color = `var(${role})`
    el.append(target)
  }
  const value = getComputedStyle(target)[property as 'color']
  if (role) target.remove()
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('No canvas.')
  context.fillStyle = '#010203'
  context.fillStyle = value
  if (context.fillStyle === '#010203') throw new Error(`The canvas can't paint ${value}.`)
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data]
}

/** A colour the browser computes for an element, in sRGB (with alpha). */
export const srgb = (locator: Locator, property: string) =>
  locator.evaluate(computedSrgb, [property, null] as [string, string | null])

/** A theme role as it resolves inside `within`, in sRGB: a probe there takes it as its text colour. */
export const roleIn = (within: Locator, role: string) =>
  within.evaluate(computedSrgb, ['color', role] as [string, string | null])

/** What is painted under a section: its own background, or the page's where it has none. */
export async function backgroundOf(page: Page, target: Locator): Promise<number[]> {
  const own = await srgb(target, 'backgroundColor')
  return own[3] === 0 ? srgb(page.locator('body'), 'backgroundColor') : own
}

/** `colour` at `opacity` over `under`, as a browser blends it (in sRGB). */
export const over = (colour: number[], opacity: number, under: number[]) =>
  [0, 1, 2].map((i) => Math.round(opacity * (colour[i] ?? 0) + (1 - opacity) * (under[i] ?? 0)))

export const near = (actual: number[] | undefined, expected: number[], tolerance = TOLERANCE) =>
  expected.slice(0, 3).every((value, i) => Math.abs((actual?.[i] ?? -99) - value) <= tolerance)

/** That two colours are the same through a screenshot's rounding, naming both if they aren't. */
export const expectNear = (actual: number[] | undefined, expected: number[], what: string) => {
  expect(
    near(actual, expected),
    `${what}: ${String(actual)} is not ${String(expected.slice(0, 3))}`,
  ).toBe(true)
}

/** The edge's height in px, as the page resolves it at this width. */
export const bandHeight = (frame: Locator) =>
  frame.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--edge-h)'
    el.append(probe)
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })

/**
 * The layout holds still: the box is read until three reads 100ms apart agree (right after a viewport change
 * the layout, and with it the vw-based edge heights, may still be the old one).
 */
export async function settled(frame: Locator) {
  const read = () =>
    frame.evaluate((el) => {
      const { left, width, bottom } = el.getBoundingClientRect()
      return [left, width, bottom + window.scrollY].join(' ')
    })
  let last = await read()
  for (let held = 0, reads = 0; held < 3; reads++) {
    if (reads > 50) throw new Error('The layout never held still.')
    await frame.page().waitForTimeout(100)
    const next = await read()
    held = next === last ? held + 1 : 0
    last = next
  }
}

/** Scrolls a frame's band to the middle of the window and returns where it is, in CSS px. */
async function scrollToBand(frame: Locator, height: number) {
  await frame.evaluate((el, h) => {
    const box = el.getBoundingClientRect()
    window.scrollBy(0, box.bottom - h / 2 - window.innerHeight / 2)
  }, height)
  return frame.evaluate((el) => {
    const { left, width, bottom } = el.getBoundingClientRect()
    return { left, width, bottom }
  })
}

/** The pixels of the window's screenshot, decoded in the page, as a function of a list of CSS px points. */
export const pixelsAt = (page: Page, png: Buffer, at: { x: number; y: number }[]) =>
  page.evaluate(
    async ({ base64, at }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('No canvas.')
      context.drawImage(image, 0, 0)
      const scale = image.naturalWidth / window.innerWidth
      return at.map(({ x, y }) => [
        ...context
          .getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1)
          .data.slice(0, 3),
      ])
    },
    { base64: png.toString('base64'), at },
  )

/** The colour at each point given in band units, read from a screenshot of the window. */
export async function readBand(page: Page, id: string, points: [x: number, y: number][]) {
  const frame = frameOf(page, id)
  await settled(frame)
  const height = await bandHeight(frame)
  const box = await scrollToBand(frame, height)
  const at = points.map(([x, y]) => ({
    x: box.left + x * box.width,
    y: box.bottom - height + y * height,
  }))
  return pixelsAt(page, await page.screenshot(), at)
}

/**
 * How deep, in CSS px, a layer's solid colour must run in a column to count as 3 px of layer: the anti-aliased
 * row where the layer meets the cut or its own line is a blend, not the layer's colour, so a 3 px layer
 * reads as 2 solid rows.
 */
export const MIN_SOLID_PX = 2

/**
 * The share of the width over which a layer is painted at least 3 px deep: for each device-pixel column of
 * the band, whether at least 3 CSS px of pixels in it are `colour`. This is the browser's own answer to
 * "does the layer clear the 3 px floor", after the section's mask has clipped it.
 */
export async function paintedShare(page: Page, id: string, colour: number[]): Promise<number> {
  const frame = frameOf(page, id)
  await settled(frame)
  const height = await bandHeight(frame)
  const box = await scrollToBand(frame, height)
  // The band, plus a little above and below it, as a screenshot of just that strip.
  const clip = {
    x: Math.max(0, box.left),
    y: box.bottom - height,
    width: box.width,
    height,
  }
  const png = await page.screenshot({ clip, type: 'png' })
  return page.evaluate(
    async ({ base64, colour, tolerance, minPx }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('No canvas.')
      context.drawImage(image, 0, 0)
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
      // Device pixels a CSS px tall: the screenshot is at the page's pixel ratio.
      const perCss = window.devicePixelRatio
      let shown = 0
      for (let x = 0; x < width; x++) {
        let run = 0
        let best = 0
        for (let y = 0; y < height; y++) {
          const i = (y * width + x) * 4
          const match = [0, 1, 2].every(
            (c) => Math.abs((data[i + c] ?? 0) - (colour[c] ?? 0)) <= tolerance,
          )
          run = match ? run + 1 : 0
          best = Math.max(best, run)
        }
        if (best / perCss >= minPx) shown++
      }
      return shown / width
    },
    { base64: png.toString('base64'), colour, tolerance: TOLERANCE, minPx: MIN_SOLID_PX },
  )
}
