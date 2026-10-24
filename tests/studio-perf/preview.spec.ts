import { expect, test, type Page } from '@playwright/test'

import { assertTarget, blockOtherProjects } from './safety'

// What an editor sees when a page opens in Structure: the form first, and Preview a tab away. Run
// at the default laptop size and at a wider one, with the Content and Pages lists open as usual.
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1920x1080', width: 1920, height: 1080 },
]

async function openSmallPage(page: Page) {
  await page.goto('/studio/structure/pages')
  await page
    .getByRole('link')
    .filter({ has: page.getByText('Performance small 0', { exact: true }) })
    .first()
    .click()
  await expect(page).toHaveURL(/studio-perf-small-0/)
}

for (const viewport of VIEWPORTS) {
  test(`page opens on the form, with Preview a tab away (${viewport.name})`, async ({
    browser,
  }, testInfo) => {
    const project = assertTarget()
    const context = await browser.newContext({
      ...testInfo.project.use,
      viewport: { width: viewport.width, height: viewport.height },
    })
    await blockOtherProjects(context, project)
    await context.addInitScript(() => {
      localStorage.setItem('currawong:studio:client-view', '0')
    })
    const page = await context.newPage()
    // Actions (click, fill) wait forever by default; fail one that never finds its element.
    page.setDefaultTimeout(60_000)
    try {
      await openSmallPage(page)

      // The form is what opens: the Title field is there at once, with Editor the selected tab.
      const title = page.getByRole('textbox', { name: 'Title', exact: true })
      await expect(title).toHaveValue('Performance small 0')
      await expect(title).toBeEditable()
      await expect(page.getByRole('tab', { name: 'Editor' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      // Nothing of the preview loads until it is asked for.
      await expect(page.locator('iframe[title^="Preview of"]')).toHaveCount(0)

      await page.getByRole('tab', { name: 'Preview' }).click()
      const frame = page.locator('iframe[title="Preview of Performance small 0"]')
      await expect(frame).toBeVisible()
      // Draft mode started through the enable route; the page's own heading is on screen.
      await expect(
        page.frameLocator('iframe[title^="Preview of"]').getByText('Performance heading 0').first(),
      ).toBeVisible()
      await expect(page.getByRole('link', { name: 'Open in Presentation' })).toHaveAttribute(
        'href',
        /mode=presentation/,
      )

      const wide = (await frame.boundingBox())?.width ?? 0
      await page.getByRole('button', { name: 'Phone width' }).click()
      await expect
        .poll(async () => (await frame.boundingBox())?.width ?? 0)
        .toBeLessThanOrEqual(390)
      await page.getByRole('button', { name: 'Desktop width' }).click()
      await expect
        .poll(async () => (await frame.boundingBox())?.width ?? 0)
        .toBeGreaterThanOrEqual(Math.min(wide, 391))

      // And back: the form is still there, unchanged.
      await page.getByRole('tab', { name: 'Editor' }).click()
      await expect(title).toHaveValue('Performance small 0')
    } finally {
      await context.close()
    }
  })
}
