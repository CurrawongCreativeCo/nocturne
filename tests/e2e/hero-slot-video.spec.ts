import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { test } from './fixtures/test'

/**
 * The video block in the hero's supporting slot (README, "Adding a slot block"), on /hero-slot-video
 * and in the section gallery: the Video section's click-to-load player and uploaded video with captions,
 * with no section around them. The CDN and both players are stand-ins, so nothing leaves the machine.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/hero-slot-video'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
const THIRD_PARTY = /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//

async function stubNetwork(page: Page) {
  const seen: string[] = []
  await page.route('https://cdn.sanity.io/**', (route) => {
    const url = route.request().url()
    if (/\.(mp4|vtt)$/.test(url)) {
      seen.push(url)
      return route.fulfill({
        contentType: url.endsWith('.vtt') ? 'text/vtt' : 'video/mp4',
        body: 'WEBVTT\n',
      })
    }
    return route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE })
  })
  await page.route(THIRD_PARTY, (route) => {
    seen.push(route.request().url())
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Player</title><p>Player</p>',
    })
  })
  return seen
}

const slot = (page: Page, key: string) =>
  page
    .locator('[data-hero-slot="slotVideo"]', { has: page.locator('[data-slot-video]') })
    .nth(key === 'youtube' ? 0 : 1)

test('the YouTube video loads nothing until Play, then one nocookie player', async ({ page }) => {
  const seen = await stubNetwork(page)
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const youtube = slot(page, 'youtube')

  await expect(youtube).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(seen.filter((url) => THIRD_PARTY.test(url))).toEqual([])
  await expect(youtube.getByText('Plays from YouTube', { exact: true })).toBeVisible()

  await youtube.getByRole('button', { name: 'Play video: Meet the team' }).click()
  const iframe = youtube.locator('iframe')
  await expect(iframe).toHaveCount(1)
  await expect(iframe).toHaveAttribute('title', 'Meet the team')
  expect(new URL((await iframe.getAttribute('src')) ?? '').origin).toBe(
    'https://www.youtube-nocookie.com',
  )
  await expect(iframe).toBeFocused()
})

test('Play works from the keyboard', async ({ page }) => {
  await stubNetwork(page)
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const youtube = slot(page, 'youtube')
  await youtube.getByRole('button', { name: 'Play video: Meet the team' }).focus()
  await page.keyboard.press('Enter')
  await expect(youtube.locator('iframe')).toHaveCount(1)
})

test('an uploaded video is a native player with captions that fetches nothing until played', async ({
  page,
}) => {
  const seen = await stubNetwork(page)
  await page.goto(PAGE)
  await page.waitForLoadState('networkidle')
  const upload = slot(page, 'upload')

  const video = upload.locator('video')
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).toHaveAttribute('title', 'Behind the scenes')
  await expect(video.locator('track[kind="captions"]')).toHaveCount(1)
  expect(seen.filter((url) => /\.(mp4|vtt)$/.test(url))).toEqual([])
})

test('the video sits in the hero slot and stays inside its room', async ({ page }) => {
  await stubNetwork(page)
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(PAGE)
    const fits = await page
      .locator('[data-hero-slot="slotVideo"]')
      .first()
      .evaluate((element) => {
        const box = element.getBoundingClientRect()
        return box.left >= 0 && box.right <= document.documentElement.clientWidth + 0.5
      })
    expect(fits, `${String(width)}px`).toBe(true)
  }
})

test('the page has no WCAG 2.2 AA violations', async ({ page }) => {
  await stubNetwork(page)
  await page.goto(PAGE)
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    violations.map(
      ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([])
})

test('the video is a link to its own page without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await stubNetwork(page)
  await page.goto(PAGE)
  await expect(page.locator('[data-hero-slot="slotVideo"]').first()).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Watch “Meet the team” on YouTube/ }),
  ).toHaveAttribute('href', /youtube\.com\/watch\?v=dQw4w9WgXcQ/)
  await context.close()
})
