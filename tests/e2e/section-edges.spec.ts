import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { galleryIds } from './fixtures/dataset.mjs'

/**
 * Section dividers (README, "Section dividers"): a section's bottom edge is cut with a mask, the
 * section below is pulled up under the cut and pads its top by the same height. The gallery holds
 * one pair of sections per case (the upper one has the edge); `/edges` is a real page with the footer.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const GALLERY = '/section-gallery'
const PHONE = { width: 360, height: 780 }
const DESKTOP = { width: 1280, height: 800 }

/** Stands in for every Sanity CDN image, so nothing depends on the network. */
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
})

const edgeIds = galleryIds.filter((id: string) => id.startsWith('edge-'))

const group = (page: Page, id: string) => page.locator(`[data-gallery-section="${id}"]`)
const upperOf = (page: Page, id: string) => group(page, id).locator('section').first()
const belowOf = (page: Page, id: string) => group(page, id).locator('section').nth(1)

/** The edge's height in px, as the page resolves the variable at this width. */
async function edgeHeight(frame: Locator): Promise<number> {
  return frame.evaluate((el) => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--edge-h)'
    el.append(probe)
    const height = probe.getBoundingClientRect().height
    probe.remove()
    return height
  })
}

/** Whether the element at the middle of a heading is the heading itself: nothing is drawn over it. */
async function isUncovered(heading: Locator): Promise<boolean> {
  // elementFromPoint only sees what is in the viewport.
  await heading.scrollIntoViewIfNeeded()
  return heading.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return hit === el || el.contains(hit)
  })
}

test.describe('the gallery', () => {
  test('has a wave between flat tones, a wave between a gradient and a picture, and a layered wave with an accent line', () => {
    for (const id of ['edge-wave-flat', 'edge-wave-gradient-image', 'edge-layered-accent-line']) {
      expect(galleryIds).toContain(id)
    }
    // The section below an edge shares its frame, so it has no entry of its own.
    expect(galleryIds.some((id: string) => id.endsWith('--below'))).toBe(false)
  })

  for (const id of edgeIds) {
    test(`${id} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(GALLERY)
      const { violations } = await new AxeBuilder({ page })
        .include(`[data-gallery-section="${id}"]`)
        .withTags(WCAG)
        .analyze()
      expect(
        violations.map(
          ({ id: rule, nodes }) => `${rule}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })

    for (const [name, viewport] of [
      ['a phone', PHONE],
      ['a desktop', DESKTOP],
    ] as const) {
      test(`${id}: the section below is not covered, on ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto(GALLERY)
        const upper = upperOf(page, id)
        const below = belowOf(page, id)
        await upper.scrollIntoViewIfNeeded()

        const [upperBox, belowBox, headingBox] = await Promise.all([
          upper.boundingBox(),
          below.boundingBox(),
          below.getByRole('heading').boundingBox(),
        ])
        if (!upperBox || !belowBox || !headingBox) throw new Error('sections not laid out')

        const height = await edgeHeight(group(page, id).locator('[data-section-edge-frame]'))
        expect(height).toBeGreaterThan(0)

        // The lower section starts one edge-height up, under the cut...
        expect(upperBox.y + upperBox.height - belowBox.y).toBeCloseTo(height, 0)
        // ...but its content starts below the upper section, exactly where it would without the edge.
        expect(headingBox.y).toBeGreaterThanOrEqual(upperBox.y + upperBox.height - 0.5)
        expect(await isUncovered(below.getByRole('heading'))).toBe(true)
        // The upper section's own content stays clear of the cut band.
        const upperHeading = await upper.getByRole('heading').boundingBox()
        if (!upperHeading) throw new Error('heading not laid out')
        expect(upperHeading.y + upperHeading.height).toBeLessThanOrEqual(
          upperBox.y + upperBox.height - height,
        )
      })
    }
  }
})

test.describe('the cut', () => {
  test('masks only the section, with the -webkit- prefix too, and keeps the content area whole', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    const upper = upperOf(page, 'edge-wave-flat')
    const [mask, webkitMask, size] = await upper.evaluate((el) => {
      const style = getComputedStyle(el)
      return [style.maskImage, style.getPropertyValue('-webkit-mask-image'), style.maskSize]
    })
    for (const value of [mask, webkitMask]) {
      expect(value).toContain('linear-gradient')
      expect(value).toContain('data:image/svg+xml')
    }
    // Two layers: everything above the band, then the band cut to the shape.
    expect(size).toMatch(/^100% calc\(100% - [\d.]+px\), 100% [\d.]+px$/)
    await expect(
      group(page, 'edge-wave-flat').locator('[data-section-edge-frame] > svg'),
    ).toHaveCount(0)
  })

  test('a straight edge keeps the same layout when the mask is not applied', async ({ page }) => {
    await page.goto(GALLERY)
    await page.addStyleTag({
      content:
        '[data-section-edge-frame] > section { mask-image: none !important; -webkit-mask-image: none !important; }',
    })
    const heading = belowOf(page, 'edge-wave-flat').getByRole('heading')
    await heading.scrollIntoViewIfNeeded()
    expect(await isUncovered(heading)).toBe(true)
  })

  test('draws the layered wave behind the section and the accent line over it', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    const frame = group(page, 'edge-layered-accent-line').locator('[data-section-edge-frame]')
    const children = frame.locator('> *')
    await expect(children).toHaveCount(3)
    await expect(children.nth(0)).toHaveAttribute('data-edge-layer', 'back')
    await expect(children.nth(1)).toHaveJSProperty('tagName', 'SECTION')
    await expect(children.nth(2)).toHaveAttribute('data-edge-layer', 'line')
    for (const index of [0, 2]) {
      await expect(children.nth(index)).toHaveAttribute('aria-hidden', 'true')
      expect(await children.nth(index).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe(
        'none',
      )
    }
    // The line is the chosen brand colour and keeps its width however the picture is stretched.
    const line = children.nth(2).locator('path')
    await expect(line).toHaveAttribute('stroke', 'var(--color-highlight)')
    await expect(line).toHaveAttribute('vector-effect', 'non-scaling-stroke')
  })

  test('has no accent line unless one is chosen', async ({ page }) => {
    await page.goto(GALLERY)
    await expect(
      group(page, 'edge-wave-flat').locator('[data-section-edge-frame] > svg'),
    ).toHaveCount(0)
    await expect(group(page, 'edge-curve').locator('[data-edge-layer="line"]')).toHaveCount(1)
  })
})

test.describe('heights', () => {
  test('are smaller on a phone than on a desktop', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(GALLERY)
    const frame = group(page, 'edge-wave-flat').locator('[data-section-edge-frame]')
    await expect.poll(() => edgeHeight(frame)).toBeGreaterThan(0)
    const phone = await edgeHeight(frame)
    await page.setViewportSize(DESKTOP)
    await expect.poll(() => edgeHeight(frame)).toBeGreaterThan(phone)
  })

  test('a custom height follows the breakpoints', async ({ page }) => {
    await page.goto(GALLERY)
    const frame = group(page, 'edge-wave-custom-heights').locator('[data-section-edge-frame]')
    // Polled after each resize: the new breakpoint applies a frame later.
    await page.setViewportSize(PHONE)
    await expect.poll(() => edgeHeight(frame)).toBe(24)
    // The tablet value is blank, so it keeps the phone's until the desktop one applies.
    await page.setViewportSize({ width: 800, height: 800 })
    await expect.poll(() => edgeHeight(frame)).toBe(24)
    await page.setViewportSize(DESKTOP)
    await expect.poll(() => edgeHeight(frame)).toBe(140)
  })
})

test.describe('on a page', () => {
  test('has no WCAG 2.2 AA violations and exactly one <h1>', async ({ page }) => {
    await page.goto('/edges')
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([])
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('does not shift once it has settled', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { shift: number }
      w.shift = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[]) {
          if (!entry.hadRecentInput) w.shift += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto('/edges')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    // The CLS budget is 0.05 (lighthouserc.json); a divider is pure CSS, so it adds none.
    expect(await page.evaluate(() => (window as unknown as { shift: number }).shift)).toBeLessThan(
      0.05,
    )
  })

  test('pulls up only the sections that follow an edge', async ({ page }) => {
    await page.goto('/edges')
    const followers = page.locator('[data-edge-above]')
    const held = await followers.evaluateAll((els) =>
      els.map((el) => el.querySelector('section')?.id),
    )
    // Not the first (nothing above it), not the shared section (a locked stub is above it), not the
    // last (the section above it has no edge): the other three sit under an edge.
    expect(held).toEqual(['edge-second', 'edge-third', 'edge-after-shared'])
  })

  test('each cut sits above the sections after it, even when they have an edge of their own', async ({
    page,
  }) => {
    await page.goto('/edges')
    const order = await page
      .locator('[data-section-edge-frame]')
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).zIndex)))
    expect(order.length).toBeGreaterThan(2)
    for (let i = 1; i < order.length; i++) expect(order[i - 1]).toBeGreaterThan(order[i] ?? 0)
    // All below the sticky header (z-40), so a cut never covers it while scrolling.
    expect(Math.max(...order)).toBeLessThan(40)
  })

  test('a members-only section is a stub with no edge, so nothing is pulled up under it', async ({
    page,
  }) => {
    const response = await page.goto('/edges')
    expect(await response?.text()).not.toContain('Secret members section')
    // The stub sits under the third section's arch but has no frame to pull up, and the section
    // after it (a shared one) has nothing above it to meet.
    await expect(
      page.locator('#edge-shared-section').locator('xpath=ancestor::*[@data-edge-above]'),
    ).toHaveCount(0)
  })

  test('a shared section carries its own edge', async ({ page }) => {
    await page.goto('/edges')
    const frame = page.locator('[data-section-edge-frame="diagonal"]')
    await expect(frame).toHaveCount(1)
    await expect(frame.locator('#shared-edge-section')).toHaveCount(1)
    // ...and the section after it is pulled up under it.
    await expect(
      page.locator('#edge-after-shared').locator('xpath=ancestor::*[@data-edge-above]'),
    ).toHaveCount(1)
  })

  test('an anchor lands with the whole cut in view', async ({ page }) => {
    await page.goto('/edges')
    const second = page.locator('#edge-second')
    const first = page.locator('[data-section-edge-frame="wave"]')
    const height = await edgeHeight(first)
    // 6rem for the sticky header, plus the edge it sits under.
    const margin = await second.evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop))
    expect(margin).toBeCloseTo(96 + height, 0)
    // A section nothing is pulled up under keeps the plain header room.
    expect(
      await page
        .locator('#edge-first')
        .evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop)),
    ).toBe(96)
  })

  test('the footer takes the last section’s edge', async ({ page }) => {
    await page.goto('/edges')
    const last = page.locator('[data-section-edge-frame="curve"]').last()
    const backdrop = page.locator('[data-edge-backdrop]')
    const footer = page.locator('footer')
    await expect(backdrop).toHaveAttribute('aria-hidden', 'true')

    const [lastBox, backdropBox, footerBox] = await Promise.all([
      last.boundingBox(),
      backdrop.boundingBox(),
      footer.boundingBox(),
    ])
    if (!lastBox || !backdropBox || !footerBox) throw new Error('page not laid out')
    const height = await edgeHeight(last)
    // The band under the cut is as tall as the edge and ends where the footer starts.
    expect(backdropBox.height).toBeCloseTo(height, 0)
    expect(backdropBox.y + backdropBox.height).toBeCloseTo(footerBox.y, 0)
    expect(lastBox.y + lastBox.height).toBeCloseTo(footerBox.y, 0)
    // It is the footer's colour, and the footer's top border is hidden so no line crosses the cut.
    const [band, footerBackground, border] = await Promise.all([
      backdrop.evaluate((el) => getComputedStyle(el).backgroundColor),
      footer.evaluate((el) => getComputedStyle(el).backgroundColor),
      footer.evaluate((el) => getComputedStyle(el).borderTopColor),
    ])
    expect(band).toBe(footerBackground)
    expect(border).toBe('rgba(0, 0, 0, 0)')
  })

  test('a page without an edge on its last section has no band', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('[data-edge-backdrop]')).toHaveCount(0)
    await expect(page.locator('[data-section-edge-frame]')).toHaveCount(0)
    await expect(page.locator('[data-edge-above]')).toHaveCount(0)
  })

  test('works at phone width without sideways scrolling', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/edges')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
})
