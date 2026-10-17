import { expect, test, type CDPSession, type Page } from '@playwright/test'

/**
 * Catches client-side leaks: a listener, node or payload that outlives the component that made it.
 * It repeats what a visitor does many times without a page load (client navigations, quick search,
 * the mobile menu, reopening the cookie banner) and checks that nothing grows round after round.
 * See README "Performance budgets".
 *
 * Counts jitter a little without leaking: React can keep the subtree it last removed (a closed
 * dialog, the previous page) alive until its next update there, about 6 listeners and up to 80
 * nodes, there in one sample and gone in the next. So each end of the run is the lower of two
 * samples, and the allowances sit above that jitter. A leak grows every round (a listener per
 * round is +20 here), so it still fails. The heap drifts a little as Next.js's router cache fills,
 * so its limit only catches large leaks, such as a page payload kept per navigation.
 */
const WARM_UP_ROUNDS = 10
const MEASURED_ROUNDS = 20
const MAX_LISTENER_GROWTH = 10
const MAX_NODE_GROWTH = 150
const MAX_HEAP_GROWTH_MB = 3

interface Sample {
  heapMB: number
  nodes: number
  listeners: number
}

/** Counts after two forced garbage collections, so only what is still referenced is measured. */
async function measure(cdp: CDPSession): Promise<Sample> {
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const { metrics } = await cdp.send('Performance.getMetrics')
  const heap = metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0
  const { nodes, jsEventListeners } = await cdp.send('Memory.getDOMCounters')
  return { heapMB: heap / 1e6, nodes, listeners: jsEventListeners }
}

/**
 * Measures until the node and listener counts hold still across three readings, so a page that is
 * still settling (images attaching load listeners, say) isn't mistaken for growth. A leak holds
 * still too, just higher, so this never hides one.
 */
async function sample(cdp: CDPSession): Promise<Sample> {
  let last = await measure(cdp)
  let steady = 0
  for (let tries = 0; tries < 20 && steady < 2; tries++) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const next = await measure(cdp)
    steady = next.nodes === last.nodes && next.listeners === last.listeners ? steady + 1 : 0
    last = next
  }
  return last
}

/** The lower of two samples one round apart: jitter shows in at most one, a leak in both. */
async function settledSample(cdp: CDPSession, run: () => Promise<void>): Promise<Sample> {
  const first = await sample(cdp)
  await run()
  const second = await sample(cdp)
  return {
    heapMB: Math.min(first.heapMB, second.heapMB),
    nodes: Math.min(first.nodes, second.nodes),
    listeners: Math.min(first.listeners, second.listeners),
  }
}

/** Follows a header link and waits for the page's last section, so the whole page has streamed in. */
async function navigate(
  page: Page,
  isMobile: boolean,
  { name, path, lastHeading }: { name: string; path: string; lastHeading: string },
) {
  if (isMobile) {
    await page.locator('header summary').click()
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name }).click()
  } else {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click()
  }
  await page.waitForURL((url) => url.pathname === path)
  await expect(page.getByRole('heading', { name: lastHeading, level: 2 })).toBeVisible()
}

const HOME = { name: 'Home', path: '/', lastHeading: 'Brand banner' }
const ABOUT = { name: 'About', path: '/about', lastHeading: 'Dark banner' }

/** One visitor session's worth of client-side work, ending where it started: on / with nothing open. */
async function round(page: Page, isMobile: boolean) {
  await navigate(page, isMobile, ABOUT)

  // Quick search: a lazily loaded dialog with listeners, a debounce timer and a fetch.
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  const searched = page.waitForResponse((response) => response.url().includes('/api/search?'), {
    timeout: 15_000,
  })
  await dialog.getByRole('searchbox').fill('design')
  await searched
  await expect(dialog.locator('ul a').first()).toBeVisible({ timeout: 15_000 })
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toHaveCount(0)

  // The cookie banner, reopened: it adds a document listener while open.
  await page.getByRole('button', { name: 'Cookie settings' }).click()
  const banner = page.getByRole('region', { name: 'Your privacy choices' })
  await expect(banner).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(banner).toBeHidden()

  await navigate(page, isMobile, HOME)
}

/** Warms up, then measures the same round repeated: nothing may grow round after round. */
async function expectNoLeak(page: Page, again: () => Promise<void>, ready: () => Promise<void>) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')

  await ready()
  // Warm-up fills what is meant to fill once: lazy chunks, the router cache, the search dialog.
  for (let i = 0; i < WARM_UP_ROUNDS; i++) await again()
  const before = await settledSample(cdp, again)
  for (let i = 0; i < MEASURED_ROUNDS; i++) await again()
  const after = await settledSample(cdp, again)

  test.info().annotations.push({
    type: 'memory',
    description: `heap ${before.heapMB.toFixed(2)} → ${after.heapMB.toFixed(2)} MB, nodes ${String(before.nodes)} → ${String(after.nodes)}, listeners ${String(before.listeners)} → ${String(after.listeners)}`,
  })

  const leak = `after ${String(MEASURED_ROUNDS)} more rounds; something registered in a client component isn't cleaned up on unmount (see README "Performance budgets")`
  expect(after.listeners - before.listeners, `event listeners grew ${leak}`).toBeLessThanOrEqual(
    MAX_LISTENER_GROWTH,
  )
  expect(after.nodes - before.nodes, `DOM nodes grew ${leak}`).toBeLessThanOrEqual(MAX_NODE_GROWTH)
  expect(after.heapMB - before.heapMB, `JS heap grew ${leak}`).toBeLessThanOrEqual(
    MAX_HEAP_GROWTH_MB,
  )
}

test('client-side work leaves no listeners, nodes or memory behind', async ({ page, isMobile }) => {
  test.setTimeout(180_000)
  await expectNoLeak(
    page,
    () => round(page, isMobile),
    async () => {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: HOME.lastHeading, level: 2 })).toBeVisible()
    },
  )
})

/**
 * The overlay: opening and closing panels (a document click listener, a hashchange listener, the
 * dialog's close handler, a lazily loaded form and the address changes) must leave nothing behind.
 */
test('opening and closing panels leaves no listeners, nodes or memory behind', async ({ page }) => {
  test.setTimeout(180_000)
  await expectNoLeak(
    page,
    async () => {
      await page.getByRole('button', { name: /Open enquiry/ }).click()
      const enquire = page.getByRole('dialog', { name: 'Enquire now' })
      await expect(enquire).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(enquire).toBeHidden()

      // The form's code loads once, on first open; later opens reuse it.
      await page.getByRole('button', { name: /Message us/ }).click()
      const message = page.getByRole('dialog', { name: 'Send us a message' })
      await expect(message.getByLabel('Your name')).toBeVisible()
      await message.getByRole('button', { name: 'Close' }).click()
      await expect(message).toBeHidden()
    },
    async () => {
      await page.goto('/panels')
      await expect(page.getByRole('heading', { level: 1, name: 'Panels' })).toBeVisible()
    },
  )
})
