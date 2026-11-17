import { describe, expect, it } from 'vitest'

import { FLOURISH_PATHS } from './divider-flourish'
import LAB from './divider-flourish.lab.json'

/** `divider-flourish.lab.json` is `flourishPath()` run from the Divider Design Lab's own source. */
describe('the Ornament flourish', () => {
  it('is the Divider Design Lab’s flourishPath(), digit for digit, on both sides', () => {
    expect(FLOURISH_PATHS[0]).toBe(LAB.l)
    expect(FLOURISH_PATHS[1]).toBe(LAB.r)
  })

  it('is mirrored about the diamond: the right half starts at the far edge', () => {
    expect(FLOURISH_PATHS[0].startsWith('M0.00 ')).toBe(true)
    expect(FLOURISH_PATHS[1].startsWith('M120.00 ')).toBe(true)
  })
})
