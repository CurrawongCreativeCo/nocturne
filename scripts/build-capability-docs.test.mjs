import { describe, expect, it } from 'vitest'

import { generate } from './build-capability-docs.mjs'

describe('the README’s Design capability contract tables', () => {
  it('are current: run `npm run design-capability-docs` after changing a declaration, evidence or exception', async () => {
    const { readme, current } = await generate()
    expect(readme).not.toBeNull()
    expect(readme).toBe(current)
  }, 60_000)
})
