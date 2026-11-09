import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The ActionIndicator rules that set `--action-on: 1`, read from globals.css: hover (inside its media
 * query), then focus. Tests match them against real markup, so the CSS and the markup are held together.
 * jsdom has no keyboard modality and never reports :focus-visible, so `FOCUS` swaps in :focus; the
 * selector's structure, which is what the tests prove, is untouched.
 */
const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')
const block = css.slice(css.indexOf('ActionIndicator (components'))
const rules = [
  ...block.matchAll(
    /\n\s*((?:[^{}\n]*\[data-action-motion\],\s*)?[^{}\n]*\[data-action-motion\])\s*\{\s*--action-on: 1/g,
  ),
]

export const HOVER_RULE = rules[0]?.[1]?.trim() ?? ''
export const FOCUS_RULE = rules[1]?.[1]?.trim() ?? ''
export const FOCUS = FOCUS_RULE.replaceAll(':focus-visible', ':focus')
