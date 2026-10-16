import { describe, expect, it } from 'vitest'

import { CUSTOM_FRAME_MAX_BYTES } from '@/lib/sanity/image-design-options'

import { checkFrameSvg } from './frame-svg'

const GOOD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100V100H0Z"/></svg>'

describe('checkFrameSvg', () => {
  it('accepts an SVG with a viewBox, with or without an XML declaration', () => {
    expect(checkFrameSvg(GOOD, GOOD.length)).toBe(true)
    expect(checkFrameSvg(`<?xml version="1.0"?>\n<!-- made in a tool -->\n${GOOD}`, 300)).toBe(true)
    expect(checkFrameSvg(GOOD.replace('viewBox="0 0 100 100"', "viewBox='0 0 8 8'"), 200)).toBe(
      true,
    )
  })

  it('refuses a file over 50 KB', () => {
    expect(checkFrameSvg(GOOD, CUSTOM_FRAME_MAX_BYTES)).toBe(true)
    expect(checkFrameSvg(GOOD, CUSTOM_FRAME_MAX_BYTES + 1)).toMatch(/under 50 KB/)
  })

  it('refuses a file that is not an SVG', () => {
    expect(checkFrameSvg('<html><body>hi</body></html>', 40)).toMatch(/not an SVG/)
    expect(checkFrameSvg('', 0)).toMatch(/not an SVG/)
  })

  it('refuses an SVG with no viewBox, even if a child element has one', () => {
    expect(
      checkFrameSvg('<svg width="10" height="10"><symbol viewBox="0 0 1 1"/></svg>', 80),
    ).toMatch(/no viewBox/)
  })

  it('refuses scripts, event handlers and embedded content', () => {
    for (const bad of [
      GOOD.replace('<path', '<script>alert(1)</script><path'),
      GOOD.replace('<path', '<path onload="x()"'),
      GOOD.replace('<path', '<foreignObject><div/></foreignObject><path'),
      GOOD.replace('<path', '<a href="javascript:alert(1)"><path'),
    ]) {
      expect(checkFrameSvg(bad, bad.length)).toMatch(/scripts or embedded/)
    }
  })
})
