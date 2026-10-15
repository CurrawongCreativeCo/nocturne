import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The Location section (README, "Location"), on a real page (/location; the section gallery has no
 * MotionProvider, so it only shows the layouts). It reads the fixture's businessInfo document:
 * 1 King Street, Newtown NSW 2042, coordinates set, Mon–Fri 8:00 am – 5:30 pm, Saturday mornings,
 * closed Sunday, Sydney time. The first section has cards and the optional interactive map; the
 * second has a map image.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/location'
const FRIDAY_MORNING = new Date('2026-10-16T10:00:00+11:00')
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`

/** Anything on a Google host: the page must make none until the visitor clicks. */
const googleRequests = (page: Page) => {
  const urls: string[] = []
  page.on('request', (request) => {
    if (/(^|\.)google(apis)?\.com$/.test(new URL(request.url()).hostname)) urls.push(request.url())
  })
  return urls
}

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.sanity.io/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE }),
  )
  // Never reach Google from a test: the embed is a stand-in page.
  await page.route(/^https:\/\/www\.google\.com\/.*/, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Map</title><p>Map</p>',
    }),
  )
})

const section = (page: Page, heading: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name: heading }) })

test('shows the address, contact details and grouped hours from Business info', async ({
  page,
}) => {
  await page.goto(PAGE)
  const visit = section(page, 'Visit us')

  await expect(visit.getByText('Find us in Newtown, or call ahead.')).toBeVisible()
  const address = visit.locator('address')
  await expect(address.getByText('Test Co')).toBeVisible()
  await expect(address.getByText('1 King Street')).toBeVisible()
  await expect(address.getByText('Newtown NSW 2042')).toBeVisible()

  // Phone and email are text and links.
  const phone = visit.getByRole('link', { name: /\(02\) 9876 5432/ })
  await expect(phone).toHaveText(/\(02\) 9876 5432/)
  await expect(phone).toHaveAttribute('href', 'tel:+61298765432')
  await expect(visit.getByRole('link', { name: /hello@example\.com/ })).toHaveAttribute(
    'href',
    'mailto:hello@example.com',
  )

  const hours = visit.getByRole('heading', { name: 'Opening hours' }).locator('..')
  await expect(hours.getByText('Mon–Fri')).toBeVisible()
  await expect(hours.getByText('8:00 am – 5:30 pm')).toBeVisible()
  await expect(hours.getByText('Sun', { exact: true })).toBeVisible()
  // The upcoming special day shows; the one in the past does not.
  await expect(hours.getByText('(Christmas Day)')).toBeVisible()
  await expect(hours.getByText('Australia Day')).toHaveCount(0)
})

test('"Get directions" is a plain link to Google Maps that opens in a new tab', async ({
  page,
}) => {
  await page.goto(PAGE)
  const link = section(page, 'Visit us').getByRole('link', { name: /Get directions/ })

  // The fixture sets coordinates, so they win over the address.
  await expect(link).toHaveAttribute(
    'href',
    'https://www.google.com/maps/dir/?api=1&destination=-33.8978%2C151.1788',
  )
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(link).toHaveAccessibleName('Get directions (opens in a new tab)')
})

test('the "Open now" badge follows the business time zone', async ({ page }) => {
  await page.clock.setFixedTime(FRIDAY_MORNING)
  await page.goto(PAGE)
  await expect(section(page, 'Visit us').getByText('Open now · closes 5:30 pm')).toBeVisible()
})

test('the badge can be switched off and the hours stay', async ({ page }) => {
  await page.clock.setFixedTime(FRIDAY_MORNING)
  await page.goto(PAGE)
  const picture = section(page, 'With a map image')
  await expect(picture.getByText('8:00 am – 5:30 pm')).toBeVisible()
  await expect(picture.getByText(/Open now|Closed now/)).toHaveCount(0)
})

test('a map image shows beside the details, and no map service loads', async ({ page }) => {
  const google = googleRequests(page)
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const picture = section(page, 'With a map image')

  await expect(picture.getByRole('img', { name: 'A map of Newtown' })).toBeVisible()
  await expect(picture.getByRole('link', { name: /^Directions/ })).toBeVisible()
  // No Google iframe, and not one request to Google (the directions link was not followed).
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(google).toEqual([])
})

test('the interactive map loads only after a click, and says it comes from Google', async ({
  page,
}) => {
  const google = googleRequests(page)
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const visit = section(page, 'Visit us')

  await expect(visit.getByText('This map comes from Google.')).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(google).toEqual([])

  await visit.getByRole('button', { name: 'Load interactive map' }).click()
  const frame = page.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('title', 'Map of 1 King Street, Newtown NSW 2042')
  await expect(frame).toHaveAttribute(
    'src',
    /^https:\/\/www\.google\.com\/maps\?q=-33\.8978%2C151\.1788&/,
  )
  // Focus follows the press: the button is gone, so the map has it.
  await expect(frame).toBeFocused()
  expect(google.some((url) => url.includes('output=embed'))).toBe(true)
})

test('without JavaScript the details and directions are still there, and the button is not', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto(PAGE)
  const visit = section(page, 'Visit us')

  await expect(visit.getByText('1 King Street')).toBeVisible()
  await expect(visit.getByText('8:00 am – 5:30 pm')).toBeVisible()
  await expect(visit.getByRole('link', { name: /Get directions/ })).toBeVisible()
  await expect(visit.getByRole('button')).toHaveCount(0)
  await context.close()
})

test('has no accessibility violations, with the map offered and loaded', async ({ page }) => {
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const check = () => new AxeBuilder({ page }).withTags(WCAG).include('main').analyze()
  expect((await check()).violations).toEqual([])

  await section(page, 'Visit us').getByRole('button', { name: 'Load interactive map' }).click()
  await expect(page.locator('iframe')).toHaveCount(1)
  expect((await check()).violations).toEqual([])
})

test('the section gallery shows every layout', async ({ page }) => {
  await page.goto('/section-gallery')
  for (const id of [
    'location',
    'location-image',
    'location-interactive',
    'location-address-only',
  ]) {
    const entry = page.locator(`[data-gallery-section="${id}"]`)
    await expect(entry.getByRole('heading', { level: 3, name: 'Address' })).toBeVisible()
  }
  const addressOnly = page.locator('[data-gallery-section="location-address-only"]')
  await expect(addressOnly.getByRole('heading', { name: 'Opening hours' })).toHaveCount(0)
  await expect(addressOnly.getByRole('heading', { name: 'Contact' })).toHaveCount(0)
})
