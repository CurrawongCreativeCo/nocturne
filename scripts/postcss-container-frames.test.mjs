import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

import containerFrames from './postcss-container-frames.mjs'

const run = async (css) =>
  (await postcss([containerFrames()]).process(css, { from: undefined })).css
const squash = (css) => css.replace(/\s+/g, ' ').trim()

describe('postcss-container-frames', () => {
  it('copies a nested width query onto the frame container and switches the original off in frames', async () => {
    const out = squash(await run('.md\\:flex { @media (width >= 48rem) { display: flex } }'))
    expect(out).toContain('@container not style(--sg-frame: 1) { display: flex }')
    expect(out).toContain('@container styleguide (width >= 48rem) { display: flex }')
  })

  it('handles a top-level query around whole rules, and max-width forms', async () => {
    const out = squash(
      await run(
        '@media (min-width: 64rem) { .a { color: red } } @media (width < 40rem) { .b { top: 0 } }',
      ),
    )
    expect(out).toContain('@container styleguide (min-width: 64rem) { .a { color: red } }')
    expect(out).toContain('@container not style(--sg-frame: 1) { .b { top: 0 } }')
    expect(out).toContain('@container styleguide (width < 40rem) { .b { top: 0 } }')
  })

  it('leaves other media queries alone', async () => {
    const css =
      '@media (prefers-reduced-motion: reduce) { .a { transition: none } } @media (hover: hover) { .b { color: red } } @media (width >= 40rem) and (hover: hover) { .c { top: 0 } }'
    expect(await run(css)).toBe(css)
  })
})

describe('include', () => {
  it('only rewrites stylesheets that match', async () => {
    const css = '@media (width >= 48rem) { .a { top: 0 } }'
    const run = async (from) =>
      (await postcss([containerFrames({ include: /site\.css$/ })]).process(css, { from })).css
    expect(await run('/app/vendor.css')).toBe(css)
    expect(await run('/app/site.css')).toContain('@container styleguide')
  })
})
