import AxeBuilder from '@axe-core/playwright'
import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

import { APP_PORT, FAKE_SANITY_PORT, REVALIDATE_SECRET } from './constants'
import { test } from './fixtures/test'

/**
 * Header dropdowns (features/site/components/nav-dropdown.tsx) and the phone menu's nested
 * disclosures. The fixture's menu is flat; these tests serve `navigationNested` from the fake lake
 * and expire the cached settings the way the Sanity webhook does. They run in their own project
 * (playwright.config.ts) so no other test sees the nested menu.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function setNavigation(request: APIRequestContext, state: 'flat' | 'nested') {
  const control = await request.post(
    `http://localhost:${FAKE_SANITY_PORT}/__fixture/navigation/${state}`,
  )
  expect(control.status()).toBe(204)
  const body = JSON.stringify({ _type: 'siteNavigation', _id: 'siteNavigation' })
  const webhook = await request.post('/api/revalidate', {
    data: body,
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(body, Date.now(), REVALIDATE_SECRET),
    },
  })
  expect(webhook.status()).toBe(200)
}

/** The first request after an expiry may still get the old copy while the new one renders. */
async function openNested(page: Page) {
  await expect
    .poll(async () => {
      await page.goto('/')
      return page.getByRole('button', { name: 'Services submenu' }).count()
    })
    .toBe(1)
}

/** Hooks get their own request context: the `request` fixture is per test, not per worker. */
async function switchNavigation(state: 'flat' | 'nested') {
  const request = await playwrightRequest.newContext({ baseURL: `http://localhost:${APP_PORT}` })
  try {
    await setNavigation(request, state)
  } finally {
    await request.dispose()
  }
}

test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  await switchNavigation('nested')
})
test.afterAll(async () => {
  await switchNavigation('flat')
})

test.describe('desktop dropdowns', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const main = (page: Page) => page.getByRole('navigation', { name: 'Main' })
  const services = (page: Page) => main(page).getByRole('button', { name: 'Services submenu' })
  const resources = (page: Page) => main(page).getByRole('button', { name: 'Resources' })
  const boxOf = async (locator: ReturnType<Page['locator']>) => {
    const box = await locator.boundingBox()
    if (!box) throw new Error('Not on screen')
    return box
  }
  const panelOf = async (page: Page, trigger: ReturnType<typeof services>) =>
    page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`)

  test.beforeEach(async ({ page }) => {
    await openNested(page)
    // Hydrated: the no-JavaScript hover fallback is off and the buttons respond.
    await expect(main(page).locator('[data-js]')).toHaveCount(3)
  })

  test('keeps flat links, a parent’s own page beside its button, and leaves out unfinished sub-links', async ({
    page,
  }) => {
    await expect(main(page).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    await expect(main(page).getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      '/about',
    )
    await expect(services(page)).toHaveAttribute('aria-expanded', 'false')
    // A parent without a page is the button itself.
    await expect(resources(page)).toHaveText('Resources')
    await resources(page).click()
    const panel = await panelOf(page, resources(page))
    await expect(panel.getByRole('link')).toHaveText(['Guides', 'Home again'])
    await expect(page.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0)
  })

  test('opens and closes on click, showing all eight links', async ({ page }) => {
    const panel = await panelOf(page, services(page))
    await expect(panel).toBeHidden()
    await services(page).click()
    await expect(services(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(panel.getByRole('listitem')).toHaveCount(8)
    await expect(panel).toBeVisible()
    await services(page).click()
    await expect(panel).toBeHidden()
  })

  test('opens with Enter and Space, Tabs through the links, and closes when focus leaves', async ({
    page,
  }) => {
    const trigger = resources(page)
    const panel = await panelOf(page, trigger)
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Space')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(panel).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(panel.getByRole('link', { name: 'Guides' })).toBeFocused()
    // A visible focus ring on the sub-link.
    const outline = await panel
      .getByRole('link', { name: 'Guides' })
      .evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('link', { name: 'Home again' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toBeHidden()
  })

  test('closes on Escape and returns focus to its button', async ({ page }) => {
    const trigger = services(page)
    await trigger.click()
    const panel = await panelOf(page, trigger)
    await panel.getByRole('link', { name: 'Design' }).focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('opens on hover after a short delay, and closes once the pointer leaves', async ({
    page,
  }) => {
    const trigger = resources(page)
    const panel = await panelOf(page, trigger)
    await trigger.hover()
    await expect(panel).toBeVisible()
    await page.mouse.move(5, 600)
    await expect(panel).toBeHidden()
  })

  test('closes on a click outside', async ({ page }) => {
    await services(page).click()
    const panel = await panelOf(page, services(page))
    await expect(panel).toBeVisible()
    await page.locator('main h1').first().click()
    await expect(panel).toBeHidden()
  })

  test('has no axe violations with a dropdown open', async ({ page }) => {
    await services(page).click()
    const results = await new AxeBuilder({ page }).include('header').withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('chevrons don’t animate with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const duration = await services(page)
      .locator('svg')
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    // The site's reduced-motion rule leaves 0.01 ms (globals.css), against 150 ms otherwise.
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.00001)
  })

  test('removes its document listeners and timers when it closes', async ({ page }) => {
    // Counts keydown and pointerdown listeners on document, added and removed, from here on.
    await page.evaluate(() => {
      const counts = { add: 0, remove: 0 }
      const track = ['keydown', 'pointerdown']
      const add = document.addEventListener.bind(document)
      const remove = document.removeEventListener.bind(document)
      document.addEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (track.includes(type)) counts.add++
        add(type, listener, options)
      }
      document.removeEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) => {
        if (track.includes(type)) counts.remove++
        remove(type, listener, options)
      }
      Object.assign(window, { __listeners: counts })
    })
    for (let i = 0; i < 5; i++) {
      await services(page).click()
      await expect(services(page)).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(services(page)).toHaveAttribute('aria-expanded', 'false')
    }
    const counts = await page.evaluate(
      () => (window as unknown as { __listeners: { add: number; remove: number } }).__listeners,
    )
    expect(counts.add).toBeGreaterThan(0)
    expect(counts.remove).toBe(counts.add)

    // Passing over quickly: the open timer is cancelled, so it never opens afterwards.
    const panel = await panelOf(page, resources(page))
    for (let i = 0; i < 5; i++) {
      await resources(page).hover()
      await page.mouse.move(5, 600)
    }
    await page.waitForTimeout(600)
    await expect(panel).toBeHidden()
  })

  test.describe('near the right edge', () => {
    test.use({ viewport: { width: 900, height: 800 } })

    test('the last dropdown stays inside the window, long labels wrapping', async ({ page }) => {
      const trigger = main(page).getByRole('button', { name: 'Company' })
      await trigger.click()
      const panel = await panelOf(page, trigger)
      await expect(panel).toBeVisible()
      const box = await boxOf(panel)
      // At its widest (18rem) it would end past the 16 px margin; it is shifted back inside.
      expect(box.width).toBeGreaterThan(280)
      expect(box.x).toBeGreaterThanOrEqual(16)
      expect(box.x + box.width).toBeLessThanOrEqual(900 - 16 + 0.5)
    })
  })

  test.describe('on a tablet', () => {
    test.use({ viewport: { width: 1080, height: 800 } })

    test('the eight-link dropdown fits, its long label wrapped', async ({ page }) => {
      await services(page).click()
      const panel = await panelOf(page, services(page))
      const box = await boxOf(panel)
      expect(box.x + box.width).toBeLessThanOrEqual(1080)
      const long = panel.getByRole('link', { name: /Commercial fit-outs/ })
      // One line is about 36 px with its padding; two are about 56.
      expect((await boxOf(long)).height).toBeGreaterThan(45)
    })
  })
})

test.describe('phone menu', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  const mobile = (page: Page) => page.getByRole('navigation', { name: 'Mobile' })

  test.beforeEach(async ({ page }) => {
    await openNested(page)
    await page.locator('header details').first().locator('> summary').click()
    await expect(mobile(page)).toBeVisible()
  })

  test('nests each dropdown as a disclosure, the parent’s own page first', async ({ page }) => {
    const services = mobile(page).locator('details', { hasText: 'Services' })
    await expect(services).not.toHaveAttribute('open')
    await expect(mobile(page).getByRole('link', { name: 'Design' })).toBeHidden()
    await services.locator('summary').click()
    await expect(services).toHaveAttribute('open', '')
    await expect(services.getByRole('link')).toHaveCount(9)
    await expect(services.getByRole('link').first()).toHaveText('Services')
    await expect(services.getByRole('link').first()).toHaveAttribute('href', '/about')
    // Flat links stay as they were.
    await expect(mobile(page).getByRole('link', { name: 'About', exact: true })).toBeVisible()
  })

  test('works from the keyboard, and Escape still closes the whole menu', async ({ page }) => {
    const resources = mobile(page).locator('details', { hasText: 'Resources' })
    await resources.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(resources).toHaveAttribute('open', '')
    await page.keyboard.press('Tab')
    await expect(resources.getByRole('link', { name: 'Guides' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('header details').first()).not.toHaveAttribute('open')
    await expect(page.locator('header details').first().locator('> summary')).toBeFocused()
  })

  test('closes after following a sub-link', async ({ page }) => {
    const resources = mobile(page).locator('details', { hasText: 'Resources' })
    await resources.locator('summary').click()
    await resources.getByRole('link', { name: 'Home again' }).click()
    await expect(page.locator('header details').first()).not.toHaveAttribute('open')
  })

  test('has no axe violations with a dropdown open', async ({ page }) => {
    await mobile(page).locator('details', { hasText: 'Services' }).locator('summary').click()
    const results = await new AxeBuilder({ page }).include('header').withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })
})
