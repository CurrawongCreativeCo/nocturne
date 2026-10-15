import { contrastRatio } from '@/lib/color/contrast'

/** Colour roles by their token name in camelCase (`surfaceAlt` is `--color-surface-alt`). */
type Colours = Readonly<Record<string, string>>

/** Text needs 4.5:1 (WCAG 2.2 AA, 1.4.3); borders, focus rings and other UI parts need 3:1 (1.4.11). */
export const TEXT_RATIO = 4.5
export const UI_RATIO = 3

export interface ContrastPair {
  id: string
  label: string
  foreground: string
  background: string
  kind: 'text' | 'ui'
}

/** The pairs sections actually draw, so a Design settings change that breaks one shows up here. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  {
    id: 'ink-surface',
    label: 'Text on page',
    foreground: 'ink',
    background: 'surface',
    kind: 'text',
  },
  {
    id: 'muted-surface',
    label: 'Muted text on page',
    foreground: 'inkMuted',
    background: 'surface',
    kind: 'text',
  },
  {
    id: 'ink-alt',
    label: 'Text on soft section',
    foreground: 'ink',
    background: 'surfaceAlt',
    kind: 'text',
  },
  {
    id: 'muted-alt',
    label: 'Muted text on soft section',
    foreground: 'inkMuted',
    background: 'surfaceAlt',
    kind: 'text',
  },
  {
    id: 'inverse',
    label: 'Text on dark section',
    foreground: 'inkInverse',
    background: 'surfaceInverse',
    kind: 'text',
  },
  {
    id: 'inverse-muted',
    label: 'Muted text on dark section',
    foreground: 'inkInverseMuted',
    background: 'surfaceInverse',
    kind: 'text',
  },
  {
    id: 'accent',
    label: 'Text on accent',
    foreground: 'accentInk',
    background: 'accent',
    kind: 'text',
  },
  {
    id: 'accent-text',
    label: 'Accent text on page',
    foreground: 'accentText',
    background: 'surface',
    kind: 'text',
  },
  {
    id: 'accent-2',
    label: 'Text on second accent',
    foreground: 'accent2Ink',
    background: 'accent2',
    kind: 'text',
  },
  {
    id: 'highlight',
    label: 'Text on highlight',
    foreground: 'highlightInk',
    background: 'highlight',
    kind: 'text',
  },
  { id: 'cta', label: 'Button label', foreground: 'ctaInk', background: 'cta', kind: 'text' },
  {
    id: 'danger',
    label: 'Error message',
    foreground: 'dangerInk',
    background: 'dangerSurface',
    kind: 'text',
  },
  {
    id: 'success',
    label: 'Success message',
    foreground: 'successInk',
    background: 'successSurface',
    kind: 'text',
  },
  {
    id: 'warning',
    label: 'Warning message',
    foreground: 'warningInk',
    background: 'warningSurface',
    kind: 'text',
  },
  {
    id: 'line',
    label: 'Input border on page',
    foreground: 'lineStrong',
    background: 'surface',
    kind: 'ui',
  },
  {
    id: 'focus',
    label: 'Focus ring on page',
    foreground: 'focus',
    background: 'surface',
    kind: 'ui',
  },
]

export interface ContrastRow extends ContrastPair {
  foregroundHex: string
  backgroundHex: string
  ratio: number
  required: number
  pass: boolean
}

/**
 * Every pair with its ratio under the colours in use. A pair whose colours are missing is left
 * out, which cannot happen with the generated tokens but keeps a custom palette from throwing.
 */
export function contrastRows(colours: Colours): ContrastRow[] {
  return CONTRAST_PAIRS.flatMap((pair) => {
    const foregroundHex = colours[pair.foreground]
    const backgroundHex = colours[pair.background]
    if (!foregroundHex || !backgroundHex) return []
    const ratio = contrastRatio(foregroundHex, backgroundHex)
    const required = pair.kind === 'text' ? TEXT_RATIO : UI_RATIO
    return [{ ...pair, foregroundHex, backgroundHex, ratio, required, pass: ratio >= required }]
  })
}

/**
 * "4.54:1". Cut, not rounded, to two decimals: WCAG's thresholds are exact, so 4.496 must not read
 * as the 4.50 it fails to reach.
 */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100 + 1e-9) / 100).toFixed(2)}:1`
}

/**
 * "36–60 px" for a fluid size such as `clamp(2.25rem, 9.375vw, 3.75rem)`, "20 px" for a fixed one,
 * or the value itself when it is not a clamp of rem lengths.
 */
export function sizeRange(size: string): string {
  const match = /^clamp\(\s*([\d.]+)rem\s*,[^,]+,\s*([\d.]+)rem\s*\)$/.exec(size)
  if (!match) return size
  const [min, max] = [Number(match[1]) * 16, Number(match[2]) * 16]
  const format = (value: number) => String(Math.round(value * 10) / 10)
  return min === max ? `${format(min)} px` : `${format(min)}–${format(max)} px`
}

/** What each step of the type scale is called on the page. */
export const TYPE_LABELS: Readonly<Record<string, string>> = {
  display: 'Display',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  lead: 'Lead paragraph',
  body: 'Body',
  small: 'Small',
}
