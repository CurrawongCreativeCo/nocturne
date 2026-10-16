import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * The Video section (README, "Video"), on /video: a YouTube and a Vimeo embed behind the click-to-load
 * facade, an uploaded video with captions, and an Ambient loop. The Sanity CDN and both players are
 * replaced by stand-ins, so nothing leaves the machine; requests to them are recorded instead.
 *
 * Headless Chromium has no H.264, so the Ambient tests replace the media element's play and pause with
 * stand-ins (the page's own logic is what is under test, not the browser's decoder).
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PAGE = '/video'
const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#6366f1"/></svg>`
const THIRD_PARTY = /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//

/** Requests the page made to the players and to the video files, in order. */
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

/** Headless Chromium can't decode MP4: stand in for play() and pause(), with the events a browser fires. */
async function stubMediaPlayback(page: Page) {
  await page.addInitScript(() => {
    const proto = HTMLMediaElement.prototype as HTMLMediaElement & { __paused?: boolean }
    Object.defineProperty(proto, 'paused', {
      configurable: true,
      get(this: { __paused?: boolean }) {
        return this.__paused ?? true
      },
    })
    proto.play = function (this: HTMLMediaElement & { __paused?: boolean }) {
      this.__paused = false
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    }
    proto.pause = function (this: HTMLMediaElement & { __paused?: boolean }) {
      if (this.__paused === false) {
        this.__paused = true
        this.dispatchEvent(new Event('pause'))
      }
    }
  })
}

const section = (page: Page, title: string) =>
  page.locator('section', { has: page.getByRole('heading', { level: 2, name: title }) })

test.describe('click-to-load embeds', () => {
  test('YouTube: only a poster and a button until the click, then one nocookie iframe', async ({
    page,
  }) => {
    const seen = await stubNetwork(page)
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const youtube = section(page, 'YouTube film')

    await expect(youtube.locator('iframe')).toHaveCount(0)
    await expect(page.locator('iframe')).toHaveCount(0)
    expect(seen.filter((url) => THIRD_PARTY.test(url))).toEqual([])
    await expect(youtube.locator('img').first()).toBeVisible()

    const play = youtube.getByRole('button', { name: 'Play video: YouTube film' })
    await expect(play).toHaveAccessibleDescription('Plays from YouTube')
    await expect(youtube.getByText('Plays from YouTube', { exact: true })).toBeVisible()
    await play.click()

    const iframe = youtube.locator('iframe')
    await expect(iframe).toHaveCount(1)
    await expect(page.locator('iframe')).toHaveCount(1)
    await expect(iframe).toHaveAttribute('title', 'YouTube film')
    const src = new URL((await iframe.getAttribute('src')) ?? '')
    expect(src.origin).toBe('https://www.youtube-nocookie.com')
    expect(src.pathname).toBe('/embed/dQw4w9WgXcQ')
    expect(src.searchParams.get('autoplay')).toBe('1')
    expect(await iframe.getAttribute('allow')).toContain('autoplay')
    // The button is gone, so focus must not be lost to <body>.
    await expect(iframe).toBeFocused()
    await expect(youtube.getByRole('button', { name: /Play video/ })).toHaveCount(0)
    // The security headers did not stop the request.
    await expect
      .poll(() =>
        seen.filter((url) => url.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')),
      )
      .toHaveLength(1)
  })

  test('Vimeo: player.vimeo.com with dnt=1, autoplay and the unlisted hash', async ({ page }) => {
    const seen = await stubNetwork(page)
    await page.goto(PAGE)
    const vimeo = section(page, 'Vimeo film')

    await expect(vimeo.locator('iframe')).toHaveCount(0)
    await expect(vimeo.getByText('Plays from Vimeo', { exact: true })).toBeVisible()
    await vimeo.getByRole('button', { name: 'Play video: Vimeo film' }).click()

    const iframe = vimeo.locator('iframe')
    await expect(iframe).toHaveCount(1)
    await expect(iframe).toHaveAttribute('title', 'Vimeo film')
    const src = new URL((await iframe.getAttribute('src')) ?? '')
    expect(src.origin).toBe('https://player.vimeo.com')
    expect(src.pathname).toBe('/video/76979871')
    expect(src.searchParams.get('dnt')).toBe('1')
    expect(src.searchParams.get('autoplay')).toBe('1')
    expect(src.searchParams.get('h')).toBe('abcdef1234')
    await expect
      .poll(() => seen.filter((url) => url.startsWith('https://player.vimeo.com/')))
      .toHaveLength(1)
  })

  test('the button works from the keyboard', async ({ page }) => {
    await stubNetwork(page)
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const youtube = section(page, 'YouTube film')
    await youtube.getByRole('button', { name: 'Play video: YouTube film' }).focus()
    await page.keyboard.press('Enter')
    await expect(youtube.locator('iframe')).toHaveCount(1)
  })
})

test.describe('uploaded video', () => {
  test('a native player that fetches nothing until played, with its captions', async ({ page }) => {
    const seen = await stubNetwork(page)
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const upload = section(page, 'Uploaded film')
    const video = upload.locator('video')

    await expect(video).toHaveCount(1)
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveAttribute('poster', /cdn\.sanity\.io\/images\//)
    await expect(video.locator('source')).toHaveAttribute('type', 'video/mp4')
    const track = video.locator('track')
    await expect(track).toHaveAttribute('kind', 'captions')
    await expect(track).toHaveAttribute('src', /\.vtt$/)
    await expect(upload.locator('iframe')).toHaveCount(0)
    expect(seen.filter((url) => url.endsWith('.mp4'))).toEqual([])
  })
})

test.describe('ambient video', () => {
  // The suite runs with reduced motion on (playwright.config.ts); the loop only plays without it.
  test.use({ reducedMotion: 'no-preference' })

  test('autoplays muted and looping, and the Pause button stops and restarts it', async ({
    page,
  }) => {
    await stubMediaPlayback(page)
    await stubNetwork(page)
    await page.goto(PAGE)
    const loop = section(page, 'Ambient loop')
    const video = loop.locator('video')

    await expect(video).toHaveCount(1)
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveJSProperty('loop', true)
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).toHaveAttribute('autoplay', '')
    await expect(video).not.toHaveAttribute('controls', /.*/)
    await expect(video).toHaveJSProperty('paused', false)

    const pause = loop.getByRole('button', { name: 'Pause background video' })
    await expect(pause).toBeVisible()
    await expect(pause).toContainText('Pause')
    await pause.click()
    await expect(video).toHaveJSProperty('paused', true)
    const resume = loop.getByRole('button', { name: 'Play background video' })
    await expect(resume).toContainText('Play')
    await resume.click()
    await expect(video).toHaveJSProperty('paused', false)
    await expect(loop.getByRole('button', { name: 'Pause background video' })).toBeVisible()
  })

  test('the Pause button works from the keyboard', async ({ page }) => {
    await stubMediaPlayback(page)
    await stubNetwork(page)
    await page.goto(PAGE)
    const loop = section(page, 'Ambient loop')
    await loop.getByRole('button', { name: 'Pause background video' }).focus()
    await page.keyboard.press('Space')
    await expect(loop.locator('video')).toHaveJSProperty('paused', true)
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the poster instead: no video, no Pause button, no file fetched', async ({
      page,
    }) => {
      const seen = await stubNetwork(page)
      await page.goto(PAGE)
      await page.waitForLoadState('networkidle')
      const loop = section(page, 'Ambient loop')
      await expect(loop.locator('img').first()).toBeVisible()
      await expect(loop.locator('video')).toHaveCount(0)
      await expect(loop.getByRole('button')).toHaveCount(0)
      expect(seen.filter((url) => url.endsWith('.mp4'))).toEqual([])
    })
  })
})

test.describe('security headers', () => {
  test('allow outbound player iframes and autoplay', async ({ request }) => {
    const headers = (await request.get(PAGE)).headers()
    // The only Content-Security-Policy is frame-ancestors (who may frame us): no frame-src or default-src to block a player.
    expect(headers['content-security-policy']).toBe("frame-ancestors 'self'")
    // Permissions-Policy lists what it turns off; none of what a player needs.
    const permissions = headers['permissions-policy'] ?? ''
    for (const feature of ['autoplay', 'fullscreen', 'encrypted-media', 'picture-in-picture']) {
      expect(permissions).not.toContain(feature)
    }
    // YouTube refuses to play without a referrer; this policy sends the origin.
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})

test.describe('accessibility', () => {
  test('/video has no WCAG 2.2 AA violations, before and after pressing Play', async ({ page }) => {
    await stubMediaPlayback(page)
    await stubNetwork(page)
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const scan = async () =>
      (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map(
        ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
      )

    expect(await scan()).toEqual([])
    await section(page, 'YouTube film')
      .getByRole('button', { name: /^Play video/ })
      .click()
    await section(page, 'Vimeo film')
      .getByRole('button', { name: /^Play video/ })
      .click()
    await expect(page.locator('iframe')).toHaveCount(2)
    expect(await scan()).toEqual([])
  })

  for (const id of ['video-embed', 'video-embed-upload', 'video-ambient']) {
    test(`${id} in the section gallery has no violations`, async ({ page }) => {
      await stubMediaPlayback(page)
      await stubNetwork(page)
      await page.goto('/section-gallery')
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
  }
})
