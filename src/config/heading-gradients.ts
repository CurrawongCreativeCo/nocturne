import type { colorHex } from './tokens.generated'

/**
 * Gradient presets for highlighted heading words (Gradient treatment, README "Highlighting words in
 * a heading"). Stops are colour tokens, not hex values, so a gradient follows a re-skin and a section
 * tone: `accent` and `ink` change with the tone (see the `[data-tone]` rules in tokens.generated.css).
 *
 * This list is the one place presets come from: the Studio offers it, the page draws it and the
 * Studio contrast check reads it. The first is the default. When design settings can hold gradients,
 * replace this constant with that data and keep the shape.
 */
export type GradientToken = keyof typeof colorHex

export interface HeadingGradient {
  /** Stored in the content. Never rename one that is in use. */
  value: string
  title: string
  description: string
  stops: readonly GradientToken[]
}

export const HEADING_GRADIENTS = [
  {
    value: 'brand',
    title: 'Brand to ink',
    description: 'The brand colour fading to the text colour. Reads well on every background.',
    stops: ['accent', 'ink'],
  },
  {
    value: 'brand-green',
    title: 'Brand to green',
    description: 'Brand colour to green. Check the contrast on dark backgrounds.',
    stops: ['accent', 'success'],
  },
  {
    value: 'brand-red',
    title: 'Brand to red',
    description: 'Brand colour to red. Check the contrast on dark backgrounds.',
    stops: ['accent', 'danger'],
  },
] as const satisfies readonly HeadingGradient[]

export const DEFAULT_GRADIENT: HeadingGradient = HEADING_GRADIENTS[0]

/** The preset stored in content; an unset or unknown value gets the default. */
export function gradientFor(value: string | null | undefined): HeadingGradient {
  return HEADING_GRADIENTS.find((gradient) => gradient.value === value) ?? DEFAULT_GRADIENT
}

const cssColor = (token: GradientToken) =>
  `var(--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})`

/** The `linear-gradient()` for a preset. Horizontal, so each wrapped line shows the whole blend. */
export function gradientCss(gradient: HeadingGradient): string {
  return `linear-gradient(90deg, ${gradient.stops.map(cssColor).join(', ')})`
}
