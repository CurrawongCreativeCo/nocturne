import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Section dividers beside the cases that used to misbehave (task 151, stage B1; README, "Section dividers"):
 * an edge on a section that renders nothing (S1), the footer's band on a Minimal page (S2) and the first and
 * last section of a Minimal page when an edge wraps them (S3). `/edge-empty`, `/edge-minimal` and
 * `/edge-minimal-follower` are the fixtures. The rules are matched against the real markup in
 * section-edge-css.test.tsx; this is what the browser then draws with them, read from its own pixels.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const section = (page: Page, id: string) => page.locator(`section#${id}`)

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (!found) throw new Error('No box: the element is not drawn.')
  return found
}

/** The edge's height in px, as the page resolves the variable at this width. */
const edgeHeight = (frame: Locator) =>
  frame.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--edge-h)'
    el.append(probe)
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })

const computed = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), property)

interface Read {
  /** The colour at each point, as the screenshot holds it (sRGB). */
  at: number[][]
  /** The page's background, as the screenshot would hold it: the root's colour, or the body's. */
  page: number[]
  /** How many pixels in `area` are the page's background, out of how many. */
  pageInArea: { count: number; of: number }
  /** The `tone` section's own colour, under its picture (sRGB), when one was asked for. */
  tone?: number[]
}

/**
 * Reads the window's own pixels: the colour at each CSS point, how much of an area (CSS px) is the page's
 * background, and a section's own colour. Those are oklch() and lab() values, so the browser converts them,
 * painted onto a canvas and read back in sRGB like the screenshot.
 */
async function pixels(
  page: Page,
  points: { x: number; y: number }[],
  { area = { x: 0, y: 0, width: 0, height: 0 }, tone = '' } = {},
): Promise<Read> {
  const png = await page.screenshot()
  return page.evaluate(
    async ({ base64, points, area, tone }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('No canvas.')
      const rgbaOf = (colour: string) => {
        const unset = '#010203'
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = unset
        context.fillStyle = colour
        if (context.fillStyle === unset) throw new Error(`The canvas can't paint ${colour}.`)
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data]
      }
      const root = rgbaOf(getComputedStyle(document.documentElement).backgroundColor)
      const background =
        root[3] === 0 ? rgbaOf(getComputedStyle(document.body).backgroundColor) : root
      if (background[3] !== 255)
        throw new Error(`The page background is not opaque: ${background.join(', ')}.`)
      context.clearRect(0, 0, 1, 1)
      context.drawImage(image, 0, 0)
      const scale = image.naturalWidth / window.innerWidth
      const rgbAt = (x: number, y: number) => [
        ...context
          .getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1)
          .data.slice(0, 3),
      ]
      const pageColour = background.slice(0, 3)
      const isPage = (rgb: number[]) =>
        rgb.every((v, i) => Math.abs(v - (pageColour[i] ?? 0)) <= 10)
      let count = 0
      let of = 0
      for (let y = area.y + 0.5; y < area.y + area.height; y += 1) {
        for (let x = area.x + 0.5; x < area.x + area.width; x += 2) {
          of += 1
          if (isPage(rgbAt(x, y))) count += 1
        }
      }
      const toneElement = tone ? document.getElementById(tone) : null
      if (tone && !toneElement) throw new Error(`No section ${tone}.`)
      return {
        at: points.map(({ x, y }) => rgbAt(x, y)),
        page: pageColour,
        pageInArea: { count, of },
        tone: toneElement
          ? rgbaOf(getComputedStyle(toneElement).backgroundColor).slice(0, 3)
          : undefined,
      }
    },
    { base64: png.toString('base64'), points, area, tone },
  )
}

/** Within 10 of each other on every channel: the same colour, through a screenshot's rounding. */
const same = (a: number[] | undefined, b: number[] | undefined) =>
  Boolean(a && b) && (a ?? []).every((v, i) => Math.abs(v - (b?.[i] ?? -99)) <= 10)

/** How tall the strip past the page's end is, in CSS px. */
const STRIP = 240

/**
 * A strip of the page past the first or last section, where iOS shows what the page draws when it is pulled
 * past its top or bottom. Padding on <body> stands in for it: it adds no element, so the rules pick the same
 * first and last section. Returns that section's box once the strip is wholly on screen and the picture has
 * loaded.
 */
async function stripPast(page: Page, id: string, side: 'top' | 'bottom') {
  await page.addStyleTag({ content: `body { padding-${side}: ${STRIP}px }` })
  // Scrolled to that end once the padding is in the layout (a phone can lay it out a moment later).
  await expect
    .poll(() =>
      page.evaluate((top) => {
        const end = top ? 0 : document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo(0, end)
        return Math.abs(window.scrollY - end) <= 1 && getComputedStyle(document.body).paddingBlock
      }, side === 'top'),
    )
    .toContain(`${STRIP}px`)
  // The picture has loaded (each test then checks it has painted over the section's own colour).
  expect(await section(page, id).locator('img').count()).toBeGreaterThan(0)
  await expect
    .poll(() =>
      section(page, id)
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true)
  const found = await section(page, id).evaluate((el) => {
    const { top, bottom, width } = el.getBoundingClientRect()
    return { top, bottom, width, height: window.innerHeight }
  })
  // The whole strip is in the window, so every point read in it is on screen.
  expect(side === 'top' ? found.top : found.height - found.bottom).toBeGreaterThanOrEqual(STRIP - 1)
  return found
}

/** The window's pixels once two screenshots in a row agree: the picture has painted and nothing is changing. */
async function settledPixels(
  page: Page,
  points: { x: number; y: number }[],
  tone: string,
): Promise<Read> {
  let previous = await pixels(page, points, { tone })
  for (let reads = 0; reads < 20; reads++) {
    const next = await pixels(page, points, { tone })
    if (next.at.every((rgb, i) => rgb.join() === previous.at[i]?.join())) return next
    previous = next
  }
  throw new Error('The pixels never held still.')
}

test.describe('beside a section that renders nothing (S1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-empty')
  })

  test('the section below it is not pulled up over the last visible section', async ({ page }) => {
    const before = await box(section(page, 'ee-before'))
    const after = await box(section(page, 'ee-after'))
    // The empty section's edge was configured but never drawn, so nothing sits under it to pull up.
    expect(after.y).toBeGreaterThanOrEqual(before.y + before.height - 0.5)
  })

  test('keeps its own spacing, with no edge height added to its top padding', async ({ page }) => {
    const plain = await computed(section(page, 'ee-before'), 'padding-top')
    expect(await computed(section(page, 'ee-after'), 'padding-top')).toBe(plain)
    expect(await computed(section(page, 'ee-after').locator('xpath=..'), 'margin-top')).toBe('0px')
  })

  test('does not cover the last visible section’s content', async ({ page }) => {
    const heading = section(page, 'ee-before').getByRole('heading', {
      name: 'Before the empty section',
    })
    await heading.scrollIntoViewIfNeeded()
    const covered = await heading.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return !(hit === el || el.contains(hit))
    })
    expect(covered).toBe(false)
  })

  test('a section that does draw its edge still pulls the one below up by exactly its height', async ({
    page,
  }) => {
    const above = await box(section(page, 'ee-control-a'))
    const below = await box(section(page, 'ee-control-b'))
    const height = await edgeHeight(page.locator('[data-section-edge-frame]').first())
    expect(height).toBeGreaterThan(0)
    expect(Math.abs(below.y - (above.y + above.height - height))).toBeLessThan(1.5)
  })

  test('under an edge right above an empty edge section, shows the page background, though a third section follows', async ({
    page,
  }) => {
    const frame = section(page, 'ee-mid-top').locator('xpath=..')
    const after = section(page, 'ee-mid-after')
    // The third section is pulled up only under a cut drawn right above it, and the empty section drew none.
    expect(await computed(after.locator('xpath=..'), 'margin-top')).toBe('0px')
    expect(await computed(after, 'padding-top')).toBe(
      await computed(section(page, 'ee-before'), 'padding-top'),
    )
    const height = await edgeHeight(frame)
    // The frame's bottom in the middle of the window, clear of the sticky header.
    const cut = await frame.evaluate((el) => {
      window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight / 2)
      const { bottom, width } = el.getBoundingClientRect()
      return { bottom, width }
    })
    const above = await box(frame)
    expect((await box(after)).y).toBeGreaterThanOrEqual(above.y + above.height - 0.5)
    // So the frame's own cut band shows the page wherever the shape leaves it: nothing is under it.
    const read = await pixels(page, [], {
      area: { x: 0, y: cut.bottom - height, width: cut.width, height },
    })
    expect(read.pageInArea.count / read.pageInArea.of).toBeGreaterThan(0.2)
  })

  test('draws no footer band when the last section rendered nothing', async ({ page }) => {
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(1)
    expect(await computed(page.locator('[data-edge-backdrop]'), 'display')).toBe('none')
    // The footer keeps its own top border, which only a drawn band takes away.
    const footer = page.getByRole('contentinfo')
    expect(await computed(footer, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
  })
})

test.describe('on a Minimal page (S2 and S3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-minimal')
  })

  test('draws no footer-coloured band: there is no footer, so the page background shows under the cut', async ({
    page,
  }) => {
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(1)
    expect(await computed(page.locator('[data-edge-backdrop]'), 'display')).toBe('none')
    expect(await computed(page.locator('[data-site-chrome]').first(), 'display')).toBe('none')
  })

  // The rules pick these sections (below), but each sits in its own edge frame, whose mask clips everything
  // to the section's box: the picture can't reach past it. These record that, and an open follow-up.
  test('first section with its own edge: the strip above it still shows the page, not the picture (open follow-up)', async ({
    page,
  }) => {
    const first = await stripPast(page, 'em-first', 'top')
    const read = await settledPixels(
      page,
      [
        { x: first.width / 2, y: first.top - STRIP / 2 },
        { x: 4, y: first.top + 4 },
      ],
      'em-first',
    )
    // The picture is drawn inside the section, over its own colour, and stops at its top.
    expect(same(read.at[1], read.tone)).toBe(false)
    expect(same(read.at[1], read.page)).toBe(false)
    expect(same(read.at[0], read.page)).toBe(true)
  })

  test('last section with its own edge: the strip below it shows the page, as its own cut does', async ({
    page,
  }) => {
    const last = await stripPast(page, 'em-last', 'bottom')
    // Inside the section just above its own cut band, where the picture is drawn.
    const band = await edgeHeight(section(page, 'em-last').locator('xpath=..'))
    const read = await settledPixels(
      page,
      [
        { x: last.width / 2, y: last.bottom + STRIP / 2 },
        { x: 4, y: last.bottom - band - 8 },
      ],
      'em-last',
    )
    expect(same(read.at[1], read.tone)).toBe(false)
    expect(same(read.at[1], read.page)).toBe(false)
    expect(same(read.at[0], read.page)).toBe(true)
  })

  test('does not stretch the middle section’s own backdrop (it is neither first nor last)', async ({
    page,
  }) => {
    // The middle section has no picture, so check the others are the only two that reach past the page.
    const stretched = await page.locator('[data-screen-backdrop]').evaluateAll(
      (els) =>
        els.filter((el) => {
          const style = getComputedStyle(el)
          return (
            style.getPropertyValue('--screen-backdrop-top').trim() !== '' ||
            style.getPropertyValue('--screen-backdrop-bottom').trim() !== ''
          )
        }).length,
    )
    expect(stretched).toBe(2)
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
  })
})

test.describe('on a Minimal page ending under an edge (S3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-minimal-follower')
  })

  test('paints the last section’s picture past the page’s end: it sits in a wrapper under an edge, with no mask of its own', async ({
    page,
  }) => {
    // It is in a wrapper, not in a frame: before task 151 the rule only found a <section> that was a child of <main>.
    await expect(section(page, 'emf-last').locator('xpath=..')).toHaveAttribute(
      'data-edge-above',
      '',
    )
    await expect(
      section(page, 'emf-last').locator('xpath=ancestor::*[@data-section-edge-frame]'),
    ).toHaveCount(0)
    const last = await stripPast(page, 'emf-last', 'bottom')
    const read = await settledPixels(
      page,
      [
        { x: last.width / 2, y: last.bottom + STRIP / 2 },
        { x: last.width / 2, y: last.bottom - 4 },
      ],
      'emf-last',
    )
    // The strip past the page's end is the picture, as it is just inside the section (over the section's
    // own colour), not the page.
    expect(same(read.at[1], read.tone)).toBe(false)
    expect(same(read.at[1], read.page)).toBe(false)
    expect(same(read.at[0], read.at[1])).toBe(true)
  })

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
  })
})

test.describe('with a composed edge (task 151, Slice 2: Tide and Contour)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edge-composed')
  })

  test('on a section that renders nothing: no frame, no parts, and the next section is not pulled up', async ({
    page,
  }) => {
    // `ct-empty` is a form section with no form and a Tide edge: it draws nothing at all.
    await expect(page.locator('section#ct-empty')).toHaveCount(0)
    const after = section(page, 'ct-after-empty')
    expect(await computed(after.locator('xpath=..'), 'margin-top')).toBe('0px')
    const previous = await after
      .locator('xpath=..')
      .evaluate(
        (el) => el.previousElementSibling?.querySelectorAll('[data-edge-part]').length ?? -1,
      )
    expect(previous).toBe(0)
  })

  test('on the last section: the footer’s band is drawn under the cut and takes the footer’s border', async ({
    page,
  }) => {
    const band = page.locator('[data-edge-backdrop]')
    await expect(band).toHaveCount(1)
    expect(await computed(band, 'display')).not.toBe('none')
    expect(await computed(page.getByRole('contentinfo'), 'border-top-color')).toBe(
      'rgba(0, 0, 0, 0)',
    )
    // Contour's lines are drawn over the band.
    await expect(
      section(page, 'ct-last').locator('xpath=..').locator('[data-edge-part^="line"]'),
    ).toHaveCount(3)
  })
})
