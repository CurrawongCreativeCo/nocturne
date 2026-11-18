import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * Focus mode on the covering backgrounds (task 177; README, "Adjust picture (Studio)"): `/picture-framing-backgrounds`.
 * The Hero's Full background and Image with panel, and the Background image every section can have, are positioned by
 * their hotspot alone, as `object-position`, measured on the cropped picture (FOCUSED in the fixtures: a crop of 10% off
 * each side and a hotspot at x .3, y .7, so 25% 70%). Each way a hero's picture can move still sits where the hotspot
 * says. With no hotspot the picture is centred as it always was, and a size placed by Position ignores the hotspot.
 */

const PAGE = '/picture-framing-backgrounds'

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
})

const section = (page: Page, heading: string) =>
  page
    .locator('#main-content section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })

async function backgroundOf(scope: Locator, selector: string) {
  const img = scope.locator(selector).first()
  await img.scrollIntoViewIfNeeded()
  return img.evaluate((node) => {
    const el = node as HTMLImageElement
    const box = el.getBoundingClientRect()
    return {
      position: getComputedStyle(el).objectPosition,
      fit: getComputedStyle(el).objectFit,
      src: new URL(el.currentSrc || el.src),
      // It covers its section.
      coversSection: box.width > 0 && box.height > 0,
    }
  })
}

for (const [heading, how] of [
  ['Background hero full', 'still'],
  ['Background hero parallax', 'under the section’s Parallax'],
  ['Background hero float', 'under the section’s Float'],
] as const) {
  test(`Hero background ${how}: the hotspot positions it on the cropped picture`, async ({
    page,
  }) => {
    const bg = await backgroundOf(section(page, heading), 'img')
    expect(bg.position).toBe('25% 70%')
    expect(bg.fit).toBe('cover')
    expect(bg.coversSection).toBe(true)
    // The crop still reaches the CDN through the URL, as it always did.
    expect(bg.src.searchParams.get('rect')).not.toBeNull()
  })
}

test('Hero background with no hotspot is centred, and still trimmed by its crop', async ({
  page,
}) => {
  const bg = await backgroundOf(section(page, 'Background hero centred'), 'img')
  expect(bg.position).toBe('50% 50%')
  expect(bg.src.searchParams.get('rect')).not.toBeNull()
})

test('a section’s Background image is positioned by the hotspot in Fill and Cover the screen', async ({
  page,
}) => {
  for (const heading of ['Background section fill', 'Background section screen']) {
    const bg = await backgroundOf(section(page, heading), '[data-section-image] img')
    expect(bg.position, heading).toBe('25% 70%')
    expect(bg.fit, heading).toBe('cover')
  }
})

test('Show the whole picture is placed by Position: the hotspot does not move it', async ({
  page,
}) => {
  const bg = await backgroundOf(
    section(page, 'Background section whole'),
    '[data-section-image] img',
  )
  expect(bg.position).toBe('0% 0%')
  expect(bg.fit).toBe('contain')
})

test('a section background with no hotspot is centred', async ({ page }) => {
  const bg = await backgroundOf(
    section(page, 'Background section centred'),
    '[data-section-image] img',
  )
  expect(bg.position).toBe('50% 50%')
})
