import { expect, type Locator } from '@playwright/test'

/**
 * Waits until React has hydrated the element. Forms are server-rendered and work without
 * JavaScript, but their code loads lazily: a field filled before hydration is lost when the form
 * hydrates, or the form is submitted natively without the values. React marks every node it has
 * hydrated with a `__reactProps$…` key, which is the signal checked here.
 */
export async function waitForHydration(target: Locator) {
  await expect
    .poll(() =>
      target.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith('__reactProps$')),
      ),
    )
    .toBe(true)
}
