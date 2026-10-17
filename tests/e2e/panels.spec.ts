import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Panels (README, "Panels"): a button whose "Goes to" is "Open a panel" opens a native <dialog> from
 * the one shared overlay, as a centred window, a side drawer, a bottom sheet or full screen.
 * /panels holds four: Enquire (Auto, nothing configured), Opening hours (side), Our story (full
 * screen) and a centred one with a form. The reduced-motion default in playwright.config.ts means
 * they fade in, so nothing is caught mid-flight.
 */

const PAGE = '/panels'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const enquireButton = (page: Page) => page.getByRole('button', { name: /Open enquiry/ })
const dialogNamed = (page: Page, name: string) => page.getByRole('dialog', { name })
/** The visible panel inside a dialog: what moves in, and what a swipe drags. */
const box = (dialog: Locator) => dialog.locator(':scope > div > div')

/**
 * The space the dialog covers. A locked page keeps its scrollbar's room (`scrollbar-gutter: stable`),
 * so where scrollbars take space (Linux CI) the dialog is narrower than the viewport; on macOS and
 * phones it is the same. Panels are measured against it, not against the viewport.
 */
const frame = (dialog: Locator) => bounds(dialog)

async function bounds(locator: Locator) {
  const rect = await locator.boundingBox()
  if (!rect) throw new Error('not visible')
  return rect
}

// Desktop rules unless a test says otherwise (the mobile project's phone would make Auto a sheet).
test.use({ viewport: { width: 1280, height: 800 } })

test.describe('opening and closing', () => {
  test('a button opens a labelled dialog, and its heading takes focus', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await enquireButton(page).click()
    const dialog = dialogNamed(page, 'Enquire now')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Enquire now' })).toBeFocused()
    await expect(dialog.getByText('Tell us what you need')).toBeVisible()
    // The page's own button was not followed to its fallback link.
    await expect(page).toHaveURL(/\/panels#panel-enquire$/)
  })

  test('keyboard: Enter opens it, Tab stays inside, Escape closes it and focus comes back', async ({
    page,
  }) => {
    await page.goto(PAGE)
    // The controller is a lazy chunk. A click waits for the button to be actionable, but Enter would
    // not: pressed before the chunk's click listener is attached, it submits the fallback form instead.
    await page.waitForLoadState('networkidle')
    await enquireButton(page).focus()
    await page.keyboard.press('Enter')
    const dialog = dialogNamed(page, 'Enquire now')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
    // The page behind is inert: Tab never reaches it. Focus is in the dialog, or on its way round
    // through the browser's own controls (where the page reports the body).
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const where = await page.evaluate(() => {
        const active = document.activeElement
        return active === document.body || active?.closest('dialog')
          ? 'ok'
          : (active?.outerHTML ?? '')
      })
      expect(where).toBe('ok')
    }
    // Back into the dialog (Shift+Tab wraps), so Escape is heard where it is.
    await dialog.getByRole('button', { name: 'Close' }).focus()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(enquireButton(page)).toBeFocused()
    await expect(page).toHaveURL(/\/panels$/)
  })

  test('the Close button and a click on the backdrop both close it', async ({ page }) => {
    await page.goto(PAGE)
    const dialog = dialogNamed(page, 'Enquire now')

    await enquireButton(page).click()
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await expect(enquireButton(page)).toBeFocused()

    await enquireButton(page).click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(8, 8)
    await expect(dialog).toBeHidden()
  })

  test('a link in the text opens the same panel, which is on the page once', async ({ page }) => {
    await page.goto(PAGE)
    // Four panels, five buttons and links: each panel is rendered once however many open it.
    await expect(page.locator('dialog')).toHaveCount(4)
    await page.getByRole('button', { name: /Enquire in the text/ }).click()
    await expect(dialogNamed(page, 'Enquire now')).toBeVisible()
  })

  test('locks the page scroll while open, and unlocks it after', async ({ page }) => {
    await page.goto(PAGE)
    const overflow = () => page.evaluate(() => document.documentElement.style.overflow)
    await enquireButton(page).click()
    await expect(dialogNamed(page, 'Enquire now')).toBeVisible()
    expect(await overflow()).toBe('hidden')
    await page.keyboard.press('Escape')
    await expect(dialogNamed(page, 'Enquire now')).toBeHidden()
    // The lock is released by the dialog's `close` event, a moment after it is hidden.
    await expect.poll(overflow).toBe('')
  })
})

test.describe('deep links', () => {
  test('#panel-<name> opens the panel on load, and closing drops it from the address', async ({
    page,
  }) => {
    await page.goto(`${PAGE}#panel-enquire`)
    const dialog = dialogNamed(page, 'Enquire now')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/panels$/)
  })

  test('a panel without a link name uses its title', async ({ page }) => {
    await page.goto(`${PAGE}#panel-opening-hours`)
    await expect(dialogNamed(page, 'Opening hours')).toBeVisible()
  })

  test('an unknown name opens nothing', async ({ page }) => {
    await page.goto(`${PAGE}#panel-nobody`)
    await expect(page.getByRole('heading', { level: 1, name: 'Panels' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the address follows the open panel, and a section anchor survives closing', async ({
    page,
  }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: /Opening hours/ }).click()
    await expect(page).toHaveURL(/#panel-opening-hours$/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/panels$/)
  })

  test('changing the hash to another panel switches to it', async ({ page }) => {
    await page.goto(`${PAGE}#panel-enquire`)
    await expect(dialogNamed(page, 'Enquire now')).toBeVisible()
    await page.evaluate(() => {
      window.location.hash = '#panel-our-story'
    })
    await expect(dialogNamed(page, 'Our story')).toBeVisible()
    await expect(dialogNamed(page, 'Enquire now')).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/panels$/)
  })
})

test.describe('presentation', () => {
  test('Auto is a centred window on a desktop', async ({ page }) => {
    await page.goto(PAGE)
    await enquireButton(page).click()
    const dialog = dialogNamed(page, 'Enquire now')
    await expect(dialog).toHaveAttribute('data-presentation', 'modal')
    const rect = await bounds(box(dialog))
    const area = await frame(dialog)
    expect(Math.abs(rect.x + rect.width / 2 - (area.x + area.width / 2))).toBeLessThan(2)
    expect(Math.abs(rect.y + rect.height / 2 - 400)).toBeLessThan(2)
    expect(rect.width).toBeLessThanOrEqual(576)
  })

  test('a side panel fills the right edge, at its chosen width', async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: /Opening hours/ }).click()
    const dialog = dialogNamed(page, 'Opening hours')
    await expect(dialog).toHaveAttribute('data-presentation', 'drawer-right')
    const rect = await bounds(box(dialog))
    expect(Math.round(rect.x + rect.width)).toBe(Math.round((await frame(dialog)).width))
    expect(Math.round(rect.height)).toBe(800)
    // Narrow: 20 rem at most.
    expect(rect.width).toBeLessThanOrEqual(320)
  })

  test('full screen covers the viewport and scrolls inside', async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: /Our story/ }).click()
    const dialog = dialogNamed(page, 'Our story')
    await expect(dialog).toHaveAttribute('data-presentation', 'fullscreen')
    const rect = await bounds(box(dialog))
    expect([Math.round(rect.x), Math.round(rect.y)]).toEqual([0, 0])
    expect([Math.round(rect.width), Math.round(rect.height)]).toEqual([
      Math.round((await frame(dialog)).width),
      800,
    ])
    const scrolls = await dialog.evaluate((element) =>
      [...element.querySelectorAll('div')].some(
        (div) => div.scrollHeight > div.clientHeight && getComputedStyle(div).overflowY === 'auto',
      ),
    )
    expect(scrolls).toBe(true)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 800 } })

    test('Auto is a bottom sheet', async ({ page }) => {
      await page.goto(PAGE)
      await enquireButton(page).click()
      const dialog = dialogNamed(page, 'Enquire now')
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('data-presentation', 'sheet')
      const rect = await bounds(box(dialog))
      expect(Math.round(rect.y + rect.height)).toBe(800)
      expect(Math.round(rect.width)).toBe(Math.round((await frame(dialog)).width))
      expect(rect.y).toBeGreaterThan(0)
      await dialog.getByRole('button', { name: 'Close' }).click()
      await expect(dialog).toBeHidden()
    })

    test('a choice the editor made is kept: centred stays a window, a side panel a drawer', async ({
      page,
    }) => {
      await page.goto(PAGE)
      await page.getByRole('button', { name: /Message us/ }).click()
      await expect(dialogNamed(page, 'Send us a message')).toHaveAttribute(
        'data-presentation',
        'modal',
      )
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: /Opening hours/ }).click()
      await expect(dialogNamed(page, 'Opening hours')).toHaveAttribute(
        'data-presentation',
        'drawer-right',
      )
    })
  })
})

test.describe('content that waits', () => {
  test('a form is not on the page until its panel first opens', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByLabel('Your name')).toHaveCount(0)

    await page.getByRole('button', { name: /Message us/ }).click()
    const dialog = dialogNamed(page, 'Send us a message')
    await expect(dialog.getByLabel('Your name')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Send message' })).toBeVisible()

    // Reopening keeps what was typed.
    await dialog.getByLabel('Your name').fill('Ann')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: /Message us/ }).click()
    await expect(dialog.getByLabel('Your name')).toHaveValue('Ann')
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the button goes to its fallback link, and no panel is shown', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await enquireButton(page).click()
    await expect(page).toHaveURL(/\/about\??$/)
  })
})

test.describe('accessibility', () => {
  const clean = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(
      violations.map(
        ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([])
  }

  test('the page with its panels closed', async ({ page }) => {
    await page.goto(PAGE)
    await clean(page)
  })

  for (const [button, name] of [
    [/Open enquiry/, 'Enquire now'],
    [/Opening hours/, 'Opening hours'],
    [/Our story/, 'Our story'],
    [/Message us/, 'Send us a message'],
  ] as const) {
    test(`with “${name}” open`, async ({ page }) => {
      await page.goto(PAGE)
      await page.getByRole('button', { name: button }).click()
      await expect(dialogNamed(page, name)).toBeVisible()
      await clean(page)
    })
  }

  test('with the sheet open on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto(PAGE)
    await enquireButton(page).click()
    await expect(dialogNamed(page, 'Enquire now')).toHaveAttribute('data-presentation', 'sheet')
    await clean(page)
  })
})

test('there is still exactly one h1', async ({ page }) => {
  await page.goto(PAGE)
  await enquireButton(page).click()
  await expect(page.locator('h1')).toHaveCount(1)
})
