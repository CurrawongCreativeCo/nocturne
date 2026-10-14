/**
 * Responsive screenshot sweep for design review: `npm run launch:screens -- https://example.com`.
 * Photographs every sitemap URL at 375, 768, 1280 and 1920 px into launch-screens/<date>/
 * (gitignored). Needs the Playwright browser: `npx playwright install chromium`.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normaliseSiteUrl, parseArgs } from './launch-check/args.mjs'
import { discoverPages, onOrigin } from './launch-check/discover.mjs'
import { followRedirects, request } from './launch-check/net.mjs'
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTHS,
  dateFolder,
  screenshotName,
} from './launch-check/screens.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HELP = `Usage: npm run launch:screens -- <url> [--max-urls=N]

Screenshots every sitemap URL (up to 200) at ${SCREEN_WIDTHS.join(', ')} px wide into launch-screens/<date>/.`

/** Scrolls to the bottom and back, so lazy images and in-view animations have run before the shot. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
  })
}

async function main() {
  let options
  let origin
  try {
    options = parseArgs(process.argv.slice(2))
    if (options.json) throw new Error('--json is for launch:check.')
    if (!options.help) origin = normaliseSiteUrl(options.url)
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${HELP}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    return
  }

  let chromium
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch {
    console.error(
      "Playwright isn't installed. Run npm install, then npx playwright install chromium.",
    )
    process.exit(1)
  }

  const home = await followRedirects(`${origin}/`)
  if (home.final.error || home.final.status !== 200) {
    console.error(`✗ ${origin} didn't load (${home.final.error ?? `HTTP ${home.final.status}`}).`)
    process.exit(1)
  }
  const siteOrigin = new URL(home.final.url).origin
  const robots = await request(`${siteOrigin}/robots.txt`, { follow: true })
  const sitemap = await discoverPages({
    origin: siteOrigin,
    robotsText: robots.text,
    request,
    cap: options.maxUrls,
  })
  const urls = [
    ...new Set([
      `${siteOrigin}/`,
      ...sitemap.urls.map((url) => new URL(onOrigin(url, siteOrigin)).href),
    ]),
  ]
  if (sitemap.capped)
    console.log(
      `The sitemap has ${sitemap.total} URLs; photographing the first ${sitemap.urls.length}.`,
    )

  const outDir = join(root, 'launch-screens', dateFolder())
  mkdirSync(outDir, { recursive: true })

  let browser
  try {
    browser = await chromium.launch()
  } catch {
    console.error("Couldn't start the browser. Run: npx playwright install chromium")
    process.exit(1)
  }
  let taken = 0
  const failures = []
  try {
    for (const width of SCREEN_WIDTHS) {
      // Reduced motion shows content in its final state, which is what a designer wants to see.
      const context = await browser.newContext({
        viewport: { width, height: SCREEN_HEIGHT },
        reducedMotion: 'reduce',
      })
      try {
        const page = await context.newPage()
        for (const url of urls) {
          try {
            await page.goto(url, { waitUntil: 'load', timeout: 45_000 })
            await scrollThrough(page)
            await page.screenshot({
              path: join(outDir, screenshotName(url, width)),
              fullPage: true,
            })
            taken += 1
            console.log(`✓ ${width} px  ${new URL(url).pathname}`)
          } catch (error) {
            failures.push(
              `${width} px ${url}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
            )
            console.error(`✗ ${width} px  ${new URL(url).pathname}`)
          }
        }
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
  console.log(`\n${taken} screenshot${taken === 1 ? '' : 's'} saved in ${outDir}`)
  if (failures.length > 0) {
    console.error(`\n${failures.length} failed:\n${failures.join('\n')}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
