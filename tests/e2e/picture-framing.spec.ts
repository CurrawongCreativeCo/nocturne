import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * "Adjust picture" (src/features/studio/components/picture-framing), tested through
 * /studio-brand-preview because Studio needs a login. The examples there hold their own values in
 * memory, so Apply and Reset can be checked without a Content Lake. The screenshots are in
 * picture-framing-visual.spec.ts, so the "Update visual baselines" workflow finds them.
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
    // The first block (the placements block at the end of the page has the same attribute).
    const holder = page.locator(`[data-framing-scheme="${scheme}"]`).first()
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

test.describe('on the Link list', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop only')

  test('the profile picture previews a circle and a framed rounded square', async ({ page }) => {
    await openPreview(page)
    for (const id of ['profile-circle', 'profile-frame']) {
      const dialog = await openDialog(page, 'light', id)
      await expect(dialog.locator('[data-picture-shape]')).toBeVisible()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
    }
  })

  test('Logo, uncropped says so, keeps the saved positioning and offers no button', async ({
    page,
  }) => {
    await openPreview(page)
    for (const scheme of SCHEMES) {
      const holder = example(page, scheme, 'profile-logo')
      await holder.scrollIntoViewIfNeeded()
      await expect(
        holder.getByText('Your image positioning is saved but isn’t applied in uncropped mode.'),
      ).toBeVisible()
      await expect(holder.getByRole('button', { name: 'Adjust picture' })).toHaveCount(0)
      // What is saved stays: only Reset removes it, and it asks first.
      await expect(holder.locator('[data-framing-values]')).toContainText('"crop"')
      await holder.getByRole('button', { name: 'Reset picture positioning' }).click()
      await expect(holder.getByText('Remove the saved positioning?')).toBeVisible()
      await holder.getByRole('button', { name: 'Keep' }).click()
      await expect(holder.locator('[data-framing-values]')).toContainText('"crop"')
    }
  })

  test('a thumbnail shows the shape the section draws, and the others as outlines', async ({
    page,
  }) => {
    await openPreview(page)
    const cards = await openDialog(page, 'light', 'thumbnail-cards')
    await expect(cards.getByText('Also shown as: Featured link')).toBeVisible()
    await cards.getByRole('button', { name: 'Cancel' }).click()
    const glass = await openDialog(page, 'light', 'thumbnail-glass')
    await expect(glass.getByText('Also shown as: Tallest row')).toBeVisible()
  })
})

test.describe('on Gallery photos and the event image (task 177)', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop only')

  const ratioOf = async (dialog: Locator) => {
    const box = await dialog.locator('[data-picture-shape]').boundingBox()
    if (!box) throw new Error('No shape')
    return box.width / box.height
  }
  const storedRatio = async (holder: Locator) => {
    const { crop } = JSON.parse(
      (await holder.locator('[data-framing-values]').textContent()) ?? '{}',
    ) as { crop?: { top: number; bottom: number; left: number; right: number } }
    if (!crop) throw new Error('No crop saved')
    // The sample picture is 1600 x 1200.
    return ((1 - crop.left - crop.right) * 1600) / ((1 - crop.top - crop.bottom) * 1200)
  }

  test('each opens in the shape its placement draws', async ({ page }) => {
    await openPreview(page)
    for (const [id, ratio] of [
      ['gallery-tile', 4 / 3],
      ['gallery-arch', 2 / 3],
      ['gallery-circle', 1],
      ['event-image', 16 / 9],
    ] as const) {
      const dialog = await openDialog(page, 'light', id)
      expect(await ratioOf(dialog), id).toBeCloseTo(ratio, 1)
      // The event image is drawn with two masks: the Featured card's is the stage, the other an outline.
      if (id === 'event-image') {
        await expect(
          dialog.getByText('Also shown as: Event page, and a Featured picture with depth'),
        ).toBeVisible()
      }
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
    }
  })

  test('keys move and zoom a tile; Apply saves a crop at the tile’s ratio; Reset removes both values', async ({
    page,
  }) => {
    await openPreview(page)
    const holder = example(page, 'light', 'gallery-tile')
    const dialog = await openDialog(page, 'light', 'gallery-tile')
    await dialog.locator('[data-picture-stage]').focus()
    for (const key of ['+', '+', '+', 'ArrowLeft', 'ArrowUp']) await page.keyboard.press(key)
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()
    await expect(holder.locator('[data-framing-values]')).toContainText('"hotspot"')
    expect(await storedRatio(holder)).toBeCloseTo(4 / 3, 2)

    // Reset goes back to inheriting the automatic fit: both values are removed, nothing centred is saved.
    await holder.getByRole('button', { name: 'Reset picture positioning' }).click()
    await holder.getByRole('button', { name: 'Remove' }).click()
    await expect(holder.getByText('Automatic fit')).toBeVisible()
    await expect(holder.locator('[data-framing-values]')).toHaveText('{}')
  })

  test('Reset inside the dialog, then Apply, removes a saved positioning too', async ({ page }) => {
    await openPreview(page)
    const holder = example(page, 'light', 'gallery-circle')
    await expect(holder.locator('[data-framing-values]')).toContainText('"crop"')
    const dialog = await openDialog(page, 'light', 'gallery-circle')
    await dialog.getByRole('button', { name: 'Reset' }).click()
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(holder.locator('[data-framing-values]')).toHaveText('{}')
  })

  test('Masonry says why there is nothing to adjust, and keeps what is saved', async ({ page }) => {
    await openPreview(page)
    const holder = example(page, 'light', 'gallery-masonry')
    await holder.scrollIntoViewIfNeeded()
    await expect(holder.getByRole('button', { name: 'Adjust picture' })).toHaveCount(0)
    await expect(holder.getByText(/^Masonry shows each photo at its own proportions/)).toBeVisible()
    await expect(holder.locator('[data-framing-values]')).toContainText('"crop"')
  })

  test('Cancel after a change asks first, and Discard keeps the saved values', async ({ page }) => {
    await openPreview(page)
    const holder = example(page, 'light', 'gallery-arch')
    const dialog = await openDialog(page, 'light', 'gallery-arch')
    await dialog.getByRole('slider', { name: 'Zoom' }).fill('120')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await dialog.getByRole('button', { name: 'Discard' }).click()
    await expect(holder.locator('[data-framing-values]')).toHaveText('{}')
  })
})
