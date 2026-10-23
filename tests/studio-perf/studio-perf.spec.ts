import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

import { expect, test, type Page, type Response } from '@playwright/test'

import { assertTarget, DATASET } from './safety'

interface LongTask {
  startTime: number
  duration: number
}
interface PerfWindow extends Window {
  studioPerfTasks: LongTask[]
  studioPerfObserver: PerformanceObserver
}
interface Sample {
  view: string
  run: number
  metric: string
  ms: number
  longTasks: { frame: string; tasks: LongTask[] }[]
}
const samples: Sample[] = []
const downloads: {
  view: string
  run: number
  count: number
  rawBytes: number
  gzipBytes: number
  fontCount: number
  fontBytes: number
}[] = []

async function settled(page: Page) {
  // Two frames after the assertion lets the browser paint the usable control.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            resolve()
          }),
        ),
      ),
  )
}

async function measure(
  page: Page,
  view: string,
  run: number,
  metric: string,
  action: () => Promise<void>,
) {
  for (const frame of page.frames())
    await frame.evaluate(() => {
      const state = window as unknown as Partial<PerfWindow>
      state.studioPerfObserver?.takeRecords()
      state.studioPerfTasks = []
    })
  const start = performance.now()
  await action()
  await settled(page)
  const ms = performance.now() - start
  const longTasks = []
  for (const frame of page.frames()) {
    const tasks = await frame.evaluate(() => {
      const state = window as unknown as PerfWindow
      for (const entry of state.studioPerfObserver.takeRecords()) {
        if (entry.duration > 200)
          state.studioPerfTasks.push({ startTime: entry.startTime, duration: entry.duration })
      }
      return state.studioPerfTasks
    })
    longTasks.push({ frame: frame === page.mainFrame() ? 'studio' : 'preview', tasks })
  }
  samples.push({ view, run, metric, ms, longTasks })
}

async function documentReady(page: Page, title: string) {
  const input = page.getByRole('textbox', { name: 'Title', exact: true })
  await expect(input).toHaveValue(title)
  await expect(input).toBeEditable()
  await expect(page.getByText('Performance heading 0', { exact: true }).first()).toBeVisible()
}

function documentLink(page: Page, title: string) {
  return page
    .getByRole('link')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first()
}

async function openDocument(page: Page, id: string, title: string) {
  await documentLink(page, title).click()
  await expect(page).toHaveURL(new RegExp(id))
  await documentReady(page, title)
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

// One serial experiment, fresh browser context (cold HTTP cache) for each of five runs per view.
test('signed-in Studio performance', async ({ browser }, testInfo) => {
  const project = assertTarget()
  for (const view of ['agency', 'client']) {
    for (let run = 1; run <= 5; run++) {
      const context = await browser.newContext({ ...testInfo.project.use })
      // Block accidental cross-project Content Lake access, including mutations from Studio plugins.
      await context.route(/https:\/\/[^/]*sanity\.io\//, async (route) => {
        const url = new URL(route.request().url())
        const hostProject = /^([a-z0-9]+)\.(?:api|apicdn)\.sanity\.io$/.exec(url.hostname)?.[1]
        // Live events put the dataset after an extra `events` segment.
        const datasetMatch =
          /\/(?:data\/(?:query|mutate|listen|doc)|data\/live\/events|assets\/(?:images|files))\/([^/]+)/.exec(
            url.pathname,
          )
        const dataset = datasetMatch?.[1]
        if ((hostProject && hostProject !== project) || (dataset && dataset !== DATASET)) {
          await route.abort()
          throw new Error(
            `Blocked a request outside the throwaway project/dataset: ${url.hostname}${url.pathname}`,
          )
        }
        await route.continue()
      })
      await context.addInitScript(
        ({ clientView }) => {
          localStorage.setItem('currawong:studio:client-view', clientView ? '1' : '0')
          const state = window as unknown as PerfWindow
          state.studioPerfTasks = []
          state.studioPerfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (entry.duration > 200)
                state.studioPerfTasks.push({ startTime: entry.startTime, duration: entry.duration })
          })
          state.studioPerfObserver.observe({ type: 'longtask', buffered: true })
          addEventListener(
            'pagehide',
            () => {
              state.studioPerfObserver.disconnect()
            },
            { once: true },
          )
        },
        { clientView: view === 'client' },
      )
      const page = await context.newPage()
      const scripts: Promise<Buffer>[] = []
      const fonts: Promise<Buffer>[] = []
      const collectDownload = (response: Response) => {
        const type = response.request().resourceType()
        if (type === 'script' || type === 'font') {
          const body = response.body()
          // Attach a rejection handler now; Promise.all below still fails the experiment.
          void body.catch(() => undefined)
          const collection = type === 'script' ? scripts : fonts
          collection.push(body)
        }
      }
      page.on('response', collectDownload)
      try {
        await measure(page, view, run, 'deskFirstLoad', async () => {
          await page.goto('/studio/structure/pages')
          // Click trial checks that the signed-in, populated desk accepts an interaction.
          const link = documentLink(page, 'Performance small 0')
          await expect(link).toBeVisible()
          await link.click({ trial: true })
        })
        page.off('response', collectDownload)
        const bodies = await Promise.all(scripts)
        const fontBodies = await Promise.all(fonts)
        downloads.push({
          view,
          run,
          count: bodies.length,
          rawBytes: bodies.reduce((n, body) => n + body.length, 0),
          gzipBytes: bodies.reduce((n, body) => n + gzipSync(body).length, 0),
          fontCount: fontBodies.length,
          fontBytes: fontBodies.reduce((n, body) => n + body.length, 0),
        })
        await measure(page, view, run, 'openSmallPage', () =>
          openDocument(page, 'studio-perf-small-0', 'Performance small 0'),
        )
        await measure(page, view, run, 'open40SectionPage', async () => {
          await openDocument(page, 'studio-perf-large', 'Performance 40 sections')
        })
        await measure(page, view, run, 'expandSection', async () => {
          await page.getByText('Performance heading 0', { exact: true }).first().click()
          await expect(page.getByRole('tab', { name: 'Content', exact: true }).last()).toBeVisible()
          await expect(
            page.getByRole('textbox', { name: 'Description', exact: true }),
          ).toBeEditable()
        })
        const largeDescription = page.getByRole('textbox', { name: 'Description', exact: true })
        const largeOriginal = await largeDescription.inputValue()
        const largeMarker = `Large page edit ${view} ${run}`
        try {
          await measure(page, view, run, 'largePageTypingToSave', async () => {
            await largeDescription.fill('')
            await largeDescription.pressSequentially(largeMarker, { delay: 50 })
            await expect(page.getByTestId('pane-footer-document-status-pulse')).toHaveText('Saved')
          })
        } finally {
          await largeDescription.fill(largeOriginal)
          await expect(page.getByTestId('pane-footer-document-status-pulse')).toHaveText('Saved')
        }
        if (view === 'agency')
          await measure(page, view, run, 'sectionDesignTab', async () => {
            await page.getByRole('tab', { name: 'Design', exact: true }).click()
            await expect(page.getByText('Background', { exact: true }).first()).toBeVisible()
          })
        await page.keyboard.press('Escape')
        await measure(page, view, run, 'switchFiveDocuments', async () => {
          for (let i = 0; i < 5; i++) {
            // The heading preview differs between fixtures, so verify each document's title input.
            await documentLink(page, `Performance small ${i}`).click()
            await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
              `Performance small ${i}`,
            )
            await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeEditable()
          }
        })
        await measure(page, view, run, 'presentationLoad', async () => {
          await page.goto('/studio/presentation?preview=%2Fstudio-perf-small-0')
          // Draft mode adds invisible Visual Editing markers to text, so the heading is matched by
          // its words, not its exact name.
          await expect(
            page.frameLocator('iframe').getByRole('heading', { name: /Performance heading 0/ }),
          ).toBeVisible()
          await expect(
            page.frameLocator('iframe').getByRole('link', { name: 'Next performance page' }),
          ).toBeVisible()
          await expect(page.getByRole('checkbox', { name: 'Edit', exact: true })).toBeEnabled()
        })
        // Presentation applies the change a moment after the click, so wait for it rather than
        // using uncheck(), which reads the state immediately.
        const edit = page.getByRole('checkbox', { name: 'Edit', exact: true })
        if (await edit.isChecked()) await edit.click()
        await expect(edit).not.toBeChecked()
        await measure(page, view, run, 'presentationSwitchFiveRoutes', async () => {
          for (let i = 1; i <= 5; i++) {
            const frame = page.frameLocator('iframe')
            await frame.getByRole('link', { name: 'Next performance page' }).click()
            await expect(
              frame.getByRole('heading', { name: new RegExp(`Performance heading ${i % 5}`) }),
            ).toBeVisible()
          }
        })
        // Edit through the actual Studio input, including validation, patching and preview refresh.
        await page.getByText('Performance heading 0', { exact: true }).first().click()
        const description = page.getByRole('textbox', { name: 'Description', exact: true })
        const original = await description.inputValue()
        const marker = `Preview update ${view} ${run}`
        try {
          await measure(page, view, run, 'editToPreview', async () => {
            await description.fill(marker)
            await expect(
              page.frameLocator('iframe').getByText(marker, { exact: true }),
            ).toBeVisible()
          })
        } finally {
          await description.fill(original)
          await expect(
            page.frameLocator('iframe').getByText(original, { exact: true }),
          ).toBeVisible()
        }
      } finally {
        await context.close()
        console.log(`Finished ${view} run ${run} of 5`)
      }
    }
  }
  const medians = Object.fromEntries(
    [...new Set(samples.map((s) => `${s.view}.${s.metric}`))].map((key) => [
      key,
      median(samples.filter((s) => `${s.view}.${s.metric}` === key).map((s) => s.ms)),
    ]),
  )
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(
    new Date(),
  )
  const directory = 'tests/studio-perf/results'
  await mkdir(directory, { recursive: true })
  const path = `${directory}/${date}.json`
  let previous: unknown[] = []
  try {
    previous = JSON.parse(await readFile(path, 'utf8')) as unknown[]
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
  previous.push({
    recordedAt: new Date().toISOString(),
    label: process.env.STUDIO_PERF_LABEL || 'baseline',
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
    project,
    dataset: DATASET,
    browser: browser.version(),
    platform: process.platform,
    runs: 5,
    mediansMs: medians,
    downloads,
    samples,
  })
  await writeFile(path, `${JSON.stringify(previous, null, 2)}\n`)
  console.log(`Studio performance results: ${path}`)
})
