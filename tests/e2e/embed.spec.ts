import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { REJECTED_CONSENT } from './constants'

/**
 * The Embed section (README, "Embed"), on /embed: a Typeform form (tall), a Google map and a Spotify
 * playlist (exact height) behind the click-to-load facade. The providers are replaced by stand-ins,
 * so nothing leaves the machine; requests to them are recorded instead.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/embed'
const THIRD_PARTY = /^https:\/\/(form\.typeform\.com|www\.google\.com|open\.spotify\.com)\//
const ACCEPTED_CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  analytics: false,
  marketing: true,
  savedAt: '2026-01-01T00:00:00.000Z',
})

/** Requests the page made to the providers, in order. */
async function stubProviders(page: Page) {
  const seen: string[] = []
  await page.route(THIRD_PARTY, (route) => {
    seen.push(route.request().url())
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Provider</title><p>Provider</p>',
    })
  })
  return seen
}

const choose = (page: Page, stored: string) =>
  page.addInitScript((value) => {
    localStorage.setItem('consent', value)
  }, stored)

const section = (page: Page, heading: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name: heading }) })

test.describe('with marketing cookies accepted', () => {
  test.beforeEach(async ({ page }) => {
    await choose(page, ACCEPTED_CONSENT)
  })

  test('loads nothing from a provider, and no iframe, until the click', async ({ page }) => {
    const seen = await stubProviders(page)
    await page.goto(PAGE)
    await expect(
      section(page, 'Book a consultation').getByRole('button', { name: 'Show the form' }),
    ).toBeVisible()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('iframe')).toHaveCount(0)
    expect(seen).toEqual([])
  })

  test('says the provider sets cookies before anything loads', async ({ page }) => {
    await stubProviders(page)
    await page.goto(PAGE)
    const form = section(page, 'Book a consultation')
    await expect(form.getByText('Typeform sets cookies when the form loads.')).toBeVisible()
    await expect(form.getByRole('button', { name: 'Show the form' })).toHaveAccessibleDescription(
      /Typeform sets cookies/,
    )
  })

  test('each button names its own content and loads only its own iframe', async ({ page }) => {
    const seen = await stubProviders(page)
    await page.goto(PAGE)

    await expect(
      section(page, 'Find the studio').getByRole('button', { name: 'Show the map' }),
    ).toBeVisible()
    await expect(
      section(page, 'Our studio playlist').getByRole('button', { name: 'Show the player' }),
    ).toBeVisible()

    await section(page, 'Find the studio').getByRole('button', { name: 'Show the map' }).click()
    const frame = page.locator('iframe')
    await expect(frame).toHaveCount(1)
    await expect(frame).toHaveAttribute('title', 'Find the studio')
    await expect(frame).toHaveAttribute('loading', 'lazy')
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\/embed\?pb=/)
    await expect(frame).toBeFocused()
    expect(seen.every((url) => url.startsWith('https://www.google.com/'))).toBe(true)
  })

  test('the iframe is sandboxed with no top navigation, same-origin framing only for the provider', async ({
    page,
  }) => {
    await stubProviders(page)
    await page.goto(PAGE)
    await section(page, 'Book a consultation')
      .getByRole('button', { name: 'Show the form' })
      .click()

    const frame = page.locator('iframe')
    await expect(frame).toHaveAttribute('src', 'https://form.typeform.com/to/AbCd1234')
    const sandbox = (await frame.getAttribute('sandbox')) ?? ''
    expect(sandbox.split(' ')).toEqual(
      expect.arrayContaining(['allow-scripts', 'allow-same-origin', 'allow-forms']),
    )
    expect(sandbox).not.toContain('allow-top-navigation')
    expect(sandbox).not.toContain('allow-modals')
  })

  test('the height follows the preset, an exact height, or the provider', async ({ page }) => {
    await stubProviders(page)
    await page.goto(PAGE)
    const heightOf = async (heading: string, button: string) => {
      const part = section(page, heading)
      await part.getByRole('button', { name: button }).click()
      return (await part.locator('iframe').boundingBox())?.height
    }
    // Tall preset, the provider's own default (medium), and an exact 352 px.
    expect(await heightOf('Book a consultation', 'Show the form')).toBe(720)
    expect(await heightOf('Find the studio', 'Show the map')).toBe(480)
    expect(await heightOf('Our studio playlist', 'Show the player')).toBe(352)
  })

  test('always offers the provider’s own page, safely', async ({ page }) => {
    await stubProviders(page)
    await page.goto(PAGE)
    const link = section(page, 'Our studio playlist').getByRole('link', { name: /Open on Spotify/ })
    await expect(link).toHaveAttribute(
      'href',
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    )
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  })

  test('has no accessibility violations, before and after the click', async ({ page }) => {
    await stubProviders(page)
    await page.goto(PAGE)
    await expect(page.getByRole('button', { name: 'Show the form' })).toBeVisible()
    const before = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(before.violations).toEqual([])

    await page.getByRole('button', { name: 'Show the form' }).click()
    await expect(page.locator('iframe')).toHaveCount(1)
    const after = await new AxeBuilder({ page }).withTags(WCAG).exclude('iframe').analyze()
    expect(after.violations).toEqual([])
  })
})

test.describe('without marketing cookies', () => {
  test('shows why, offers cookie settings and loads nothing', async ({ page }) => {
    await choose(page, REJECTED_CONSENT)
    const seen = await stubProviders(page)
    await page.goto(PAGE)
    const form = section(page, 'Book a consultation')

    await expect(form.getByText(/needs marketing cookies, which are off/)).toBeVisible()
    await expect(form.getByRole('button', { name: 'Show the form' })).toHaveCount(0)
    await expect(form.getByRole('link', { name: /Open on Typeform/ })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('iframe')).toHaveCount(0)
    expect(seen).toEqual([])

    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
    expect(results.violations).toEqual([])
  })

  test('accepting marketing cookies in the banner brings the button back', async ({ page }) => {
    await choose(page, REJECTED_CONSENT)
    await stubProviders(page)
    await page.goto(PAGE)
    const form = section(page, 'Book a consultation')

    await form.getByRole('button', { name: 'Cookie settings' }).click()
    await page.getByRole('button', { name: 'Accept all' }).click()
    await expect(form.getByRole('button', { name: 'Show the form' })).toBeVisible()
    await form.getByRole('button', { name: 'Show the form' }).click()
    await expect(form.locator('iframe')).toHaveCount(1)
  })

  test('a visitor who has not chosen yet is not shown the provider either', async ({ page }) => {
    const seen = await stubProviders(page)
    await page.goto(PAGE)
    await expect(
      section(page, 'Book a consultation').getByText(/needs marketing cookies/),
    ).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)
    expect(seen).toEqual([])
  })
})
