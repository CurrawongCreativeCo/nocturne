import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * "Adjust picture" (src/features/studio/components/picture-framing), tested through
 * /studio-brand-preview because Studio needs a login. The examples there hold their own values in
 * memory, so Apply and Reset can be checked without a Content Lake. Screenshots are Linux-only,
 * like visual.spec.ts, and are refreshed by the "Update visual baselines" workflow.
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const SCHEMES = ['light', 'dark'] as const
test.use({ reducedMotion: 'reduce' })

async function openPreview(page: Page) {
  await page.goto('/studio-brand-preview')
  await expect(page.locator('main[data-ready="true"]')).toBeVisible()
}

const example = (page: Page, scheme: string, id: string) =>
  page.locator(`[data-framing-scheme="${scheme}"] [data-framing-example="${id}"]`)

async function openDialog(page: Page, scheme: string, id: string) {
  const holder = example(page, scheme, id)
  await holder.scrollIntoViewIfNeeded()
  await holder.getByRole('button', { name: 'Adjust picture' }).click()
  const dialog = page.getByRole('dialog', { name: 'Adjust picture' })
  await expect(dialog).toBeVisible()
  return dialog
}

/** The picture's transform inside the shape: it changes only when the picture moves or zooms. */
const transformOf = (dialog: Locator) =>
  dialog.locator('[data-picture-shape] img').evaluate((img) => (img as HTMLElement).style.transform)

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Not on screen')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('with a mouse', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop only')

  test('opens in the shape, moves the picture in each direction and applies', async ({ page }) => {
    await openPreview(page)
    const dialog = await openDialog(page, 'light', 'wide')
    await expect(dialog.getByText('Drag to reposition. Use the slider to zoom.')).toBeVisible()
    // Zoom in first: at zoom 1 the picture already fills the shape, so only the loose axis moves.
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('250')
    const stage = dialog.locator('[data-picture-stage]')
    const from = await centreOf(dialog.locator('[data-picture-shape]'))
    let previous = await transformOf(dialog)
    for (const [dx, dy] of [
      [-60, 0],
      [60, 0],
      [0, -40],
      [0, 40],
    ] as const) {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 })
      await page.mouse.up()
      const next = await transformOf(dialog)
      expect(next, `a drag of ${dx},${dy} moves the picture`).not.toBe(previous)
      previous = next
    }
    await expect(stage).toBeVisible()
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()
    await expect(example(page, 'light', 'wide').locator('[data-framing-values]')).toContainText(
      '"crop"',
    )
    await expect(example(page, 'light', 'wide').getByText('Adjusted')).toBeVisible()
  })

  test('Cancel changes nothing, and Reset removes the saved positioning', async ({ page }) => {
    await openPreview(page)
    let dialog = await openDialog(page, 'light', 'circle')
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('200')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog.getByText('Discard changes?')).toBeVisible()
    await dialog.getByRole('button', { name: 'Discard' }).click()
    await expect(example(page, 'light', 'circle').getByText('Automatic fit')).toBeVisible()

    dialog = await openDialog(page, 'light', 'circle')
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('200')
    await dialog.getByRole('button', { name: 'Apply' }).click()
    const holder = example(page, 'light', 'circle')
    await holder.getByRole('button', { name: 'Reset picture positioning' }).click()
    await expect(holder.getByText('Remove the saved positioning?')).toBeVisible()
    await holder.getByRole('button', { name: 'Remove' }).click()
    await expect(holder.getByText('Automatic fit')).toBeVisible()
    await expect(holder.locator('[data-framing-values]')).not.toContainText('"crop"')
  })

  test('opens where it was left, and keys move and zoom the picture', async ({ page }) => {
    await openPreview(page)
    let dialog = await openDialog(page, 'light', 'circle')
    await dialog.locator('[data-picture-stage]').focus()
    await page.keyboard.press('+')
    await page.keyboard.press('+')
    await page.keyboard.press('Shift+ArrowLeft')
    await expect(dialog.getByRole('slider', { name: 'Zoom' })).toHaveAttribute(
      'aria-valuetext',
      'Zoom 110%',
    )
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()
    // Focus returns to the button that opened the dialog.
    await expect(
      example(page, 'light', 'circle').getByRole('button', { name: 'Adjust picture' }),
    ).toBeFocused()
    dialog = await openDialog(page, 'light', 'circle')
    await expect(dialog.getByRole('slider', { name: 'Zoom' })).toHaveAttribute(
      'aria-valuetext',
      'Zoom 110%',
    )
  })
})

test.describe('with touch', () => {
  test.use({ hasTouch: true })
  test.skip(({ isMobile, browserName }) => isMobile || browserName !== 'chromium', 'Chromium touch')

  test('a one-finger drag moves the picture', async ({ page }) => {
    await openPreview(page)
    const dialog = await openDialog(page, 'light', 'wide')
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('250')
    const before = await transformOf(dialog)
    const from = await centreOf(dialog.locator('[data-picture-shape]'))
    const session = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      session.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
      })
    await touch('touchStart', from.x, from.y)
    for (let step = 1; step <= 6; step += 1) await touch('touchMove', from.x - step * 12, from.y)
    await touch('touchEnd', from.x - 72, from.y)
    await expect.poll(() => transformOf(dialog)).not.toBe(before)
  })
})

for (const scheme of SCHEMES) {
  test(`has no accessibility violations, ${scheme}`, async ({ page }) => {
    await openPreview(page)
    const holder = page.locator(`[data-framing-scheme="${scheme}"]`)
    await holder.scrollIntoViewIfNeeded()
    const results = await new AxeBuilder({ page })
      .include(`[data-framing-scheme="${scheme}"]`)
      .withTags(WCAG)
      .analyze()
    expect(results.violations).toEqual([])

    for (const id of ['circle', 'wide']) {
      const dialog = await openDialog(page, scheme, id)
      const open = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(WCAG)
        .analyze()
      expect(open.violations, `${id} dialog, ${scheme}`).toEqual([])
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
    }
  })
}

test.describe('screenshots', () => {
  test.skip(
    process.platform !== 'linux' && !process.env.E2E_VISUAL_ANY_OS,
    'Visual baselines are Linux-only; refresh them with the "Update visual baselines" workflow',
  )
  test.skip(({ isMobile }) => isMobile, 'Sized explicitly below')

  for (const scheme of SCHEMES) {
    for (const width of [390, 1280]) {
      test(`the dialog at ${width}px, ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
        await openPreview(page)
        const dialog = await openDialog(page, scheme, 'circle')
        await expect(dialog).toHaveScreenshot(`picture-framing-${scheme}-${width}.png`)
      })
    }
  }
})
