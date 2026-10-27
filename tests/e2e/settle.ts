import type { Page } from '@playwright/test'

/** Long enough for a slow CI runner to decode the gallery's pictures; far inside the 30 s test timeout. */
export const SETTLE_LIMIT_MS = 10_000

/**
 * Waits until web fonts are in use and every picture, lazy ones included, has decoded, so a screenshot
 * never catches a half-loaded page. A picture that never answers used to hang here until the 30 s test
 * timeout (and again on the CI retry); now it fails after `limitMs` and names the pictures. A picture
 * that answers with an error still settles: the screenshot shows it missing, as before.
 */
export async function settleImagesAndFonts(page: Page, { limitMs = SETTLE_LIMIT_MS } = {}) {
  const stuck = await page.evaluate(async (limit) => {
    const within = (promise: Promise<unknown>, what: string) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<string>((resolve) => {
        timer = setTimeout(() => {
          resolve(what)
        }, limit)
      })
      // A rejection (a broken picture) counts as settled; only running out of time is reported.
      return Promise.race([
        promise.then(
          () => '',
          () => '',
        ),
        timeout,
      ]).finally(() => {
        clearTimeout(timer)
      })
    }
    for (const img of document.querySelectorAll('img')) img.loading = 'eager'
    const waits = [...document.querySelectorAll('img')].map((img) =>
      within(img.decode(), `picture ${img.currentSrc || img.src || '(no source)'}`),
    )
    waits.push(within(document.fonts.ready, 'web fonts'))
    return (await Promise.all(waits)).filter(Boolean)
  }, limitMs)

  if (stuck.length > 0) {
    const list = stuck.map((what) => `  - ${what}`).join('\n')
    const heading = `${String(stuck.length)} item(s) on ${page.url()} did not finish loading within ${String(limitMs)} ms:`
    throw new Error(
      `${heading}\n${list}\n` +
        'A picture that never loads usually has a request nobody answers: check the page.route stubs ' +
        'for cdn.sanity.io in this spec (or the image URL the fixture uses) before blaming the page.',
    )
  }
}
