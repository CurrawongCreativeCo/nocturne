import { stegaClean } from 'next-sanity'

import { colorHex } from '@/config/tokens.generated'
import { siteDecisionVars, type SiteDecisionInput } from '@/lib/design/site-decisions'

import { adjustLightnessForContrast, contrastRatio } from './contrast'
import { brandGradients, gradientInk, gradientSamples, type GradientInput } from './gradients'
import { HEX_PATTERN, hexToOklch, oklchToHex } from './oklch'

/** The generated token colours, camelCase hex (what `colorHex` in tokens.generated.ts holds). */
export type BaseColours = Readonly<Record<keyof typeof colorHex, string>>

export const DEFAULT_BASE: BaseColours = colorHex

/** Studio "Design settings" values as stored (and as the settings query returns them). */
export interface DesignOverrides extends SiteDecisionInput {
  appearance?: string | null
  primary?: string | null
  secondary?: string | null
  highlight?: string | null
  surface?: string | null
  surfaceAlt?: string | null
  surfaceInverse?: string | null
  ink?: string | null
  inkMuted?: string | null
  line?: string | null
  gradients?: readonly (GradientInput | null)[] | null
  /** Brand colours → Buttons: `gradient` fills the main button from the gradient named by `buttonGradient`. */
  buttonFill?: string | null
  /** The slug of one of `gradients` (as a section's Gradient stores it). */
  buttonGradient?: string | null
}

/** Text needs 4.5:1 (WCAG 2.2 AA); borders, icons and large text need 3:1. */
export const TEXT_RATIO = 4.5
export const UI_RATIO = 3

export interface ContrastCheck {
  id: string
  /** The Studio fields this check is shown on. */
  fields: readonly string[]
  label: string
  foreground: string
  background: string
  ratio: number
  required: number
  pass: boolean
  /** True when the foreground is the colour the editor chose, so a lighter or darker shade can fix it. */
  adjustable: boolean
  /**
   * True when both colours of the pair are ones the editor chose under Advanced. Only such a pair that
   * fails is an error on Brand colours (`ResolvedDesign.errors`); anything inherited or derived is a
   * warning, and the site adjusts derived text itself.
   */
  explicit?: boolean
}

export interface DesignWarning {
  field: string
  message: string
}

export interface ResolvedDesign {
  /** CSS custom properties to set on :root: only what differs from tokens.json. */
  vars: Record<string, string>
  /** The `:root { ... }` rule, or '' when nothing is set. */
  css: string
  checks: ContrastCheck[]
  warnings: DesignWarning[]
  /**
   * Text pairs the editor chose in full (Advanced: Text or Muted text on a Background they also chose)
   * that fail AA. They block publishing Brand colours, and nothing else: page and section documents
   * only ever get warnings, because an error there would stop content being published.
   */
  errors: DesignWarning[]
  /** Every colour after the overrides (tokens.json values where nothing is set), for Studio previews. */
  colours: BaseColours
  /** The accent pair, for code that cannot read CSS variables (the OG image). */
  accent: { background: string; foreground: string }
}

const clean = (value: unknown): string | undefined =>
  typeof value === 'string' && HEX_PATTERN.test(value) ? value.toLowerCase() : undefined

const NEAR_BLACK = '#030712'
const WHITE = '#ffffff'

/** Whichever of the dark and light ink reads better on `background`, falling back to pure black or white. */
export function readableInk(background: string): string {
  const best = (a: string, b: string) =>
    contrastRatio(a, background) >= contrastRatio(b, background) ? a : b
  const ink = best(NEAR_BLACK, WHITE)
  return contrastRatio(ink, background) >= TEXT_RATIO ? ink : best('#000000', WHITE)
}

/** The same hue and chroma at a different OKLCH lightness. */
function withLightness(hex: string, lightness: number): string {
  const { c, h } = hexToOklch(hex)
  return oklchToHex({ l: lightness, c, h })
}

const lightnessOf = (hex: string) => hexToOklch(hex).l

/** Moves a colour's lightness by `delta`, never past black or white. */
const shift = (hex: string, delta: number) =>
  withLightness(hex, Math.min(1, Math.max(0, lightnessOf(hex) + delta)))

const CSS_VARIABLES: Readonly<Record<keyof typeof colorHex, string>> = Object.fromEntries(
  Object.keys(colorHex).map((key) => [
    key,
    `--color-${key.replace(/([A-Z0-9])/g, (_, char: string) => `-${char.toLowerCase()}`)}`,
  ]),
) as Record<keyof typeof colorHex, string>

/**
 * Turns the Studio's Design settings into CSS variable overrides for tokens.json's colours.
 *
 * Precedence: tokens.json (`base`) < these overrides < section tones (`[data-tone]` remaps that read
 * the variables set here) < component overrides in code. With nothing set the result is empty, so the
 * site is exactly what tokens.json defines.
 *
 * Basic: Primary (the accent role), Secondary (`accent-2`), Highlight, and Appearance (dark swaps the
 * surface and ink pairs). Advanced: the surface, ink and line colours, and gradients. Anything that is
 * not a valid "#rrggbb" is ignored. Text colours that are derived (text on Primary, accent-coloured
 * text, the inks after an Appearance or surface change) are adjusted until they reach AA; colours the
 * editor chose are never changed, only reported in `warnings` (shown by Studio validation).
 */
export function resolveDesignTokens(
  overrides: DesignOverrides | null | undefined,
  base: BaseColours = DEFAULT_BASE,
): ResolvedDesign {
  // Draft mode fetches with stega, which hides edit-link characters inside every string (hex colours
  // and `appearance` included); those fail the hex check below and the brand falls back to tokens.json.
  const input = stegaClean(overrides) ?? {}
  const colours: Record<keyof typeof colorHex, string> = { ...base }
  const dark = input.appearance === 'dark'
  const checks: ContrastCheck[] = []
  const warnings: DesignWarning[] = []
  const chosen = {
    primary: clean(input.primary),
    secondary: clean(input.secondary),
    highlight: clean(input.highlight),
    surface: clean(input.surface),
    surfaceAlt: clean(input.surfaceAlt),
    surfaceInverse: clean(input.surfaceInverse),
    ink: clean(input.ink),
    inkMuted: clean(input.inkMuted),
    line: clean(input.line),
  }

  // 1. Appearance: dark swaps each surface/ink pair, then derives what sits between them.
  if (dark) {
    colours.surface = base.surfaceInverse
    colours.surfaceInverse = base.surface
    colours.ink = base.inkInverse
    colours.inkInverse = base.ink
    colours.inkMuted = base.inkInverseMuted
    colours.inkInverseMuted = base.inkMuted
    colours.surfaceAlt = shift(colours.surface, 0.05)
    colours.line = shift(colours.surface, 0.13)
    colours.lineStrong = adjustLightnessForContrast(base.lineStrong, colours.surface, UI_RATIO).hex
    colours.focus = colours.ink
    for (const key of ['danger', 'success', 'warning'] as const) {
      colours[key] = adjustLightnessForContrast(base[key], colours.surface, TEXT_RATIO).hex
    }
  }

  // 2. Advanced overrides. A changed surface or ink re-derives the colours that follow it.
  const surfaceChanged = chosen.surface !== undefined
  if (chosen.surface) colours.surface = chosen.surface
  if (chosen.surfaceInverse) colours.surfaceInverse = chosen.surfaceInverse
  const darkSurface = relativeDark(colours.surface)
  // How far a tint sits from the surface in the base design: lighter surfaces step darker, dark ones lighter.
  const direction = darkSurface ? 1 : -1
  if (chosen.surfaceAlt) colours.surfaceAlt = chosen.surfaceAlt
  else if (surfaceChanged) colours.surfaceAlt = shift(colours.surface, direction * 0.033)
  if (chosen.line) colours.line = chosen.line
  else if (surfaceChanged) {
    colours.line = shift(colours.surface, direction * (darkSurface ? 0.13 : 0.072))
    colours.lineStrong = adjustLightnessForContrast(
      colours.lineStrong,
      colours.surface,
      UI_RATIO,
    ).hex
  }
  if (chosen.ink) colours.ink = chosen.ink
  if (chosen.inkMuted) colours.inkMuted = chosen.inkMuted

  // 3. Derived text colours: keep them readable on the surfaces they sit on.
  if (!chosen.ink && contrastRatio(colours.ink, colours.surface) < TEXT_RATIO) {
    colours.ink = readableInk(colours.surface)
  }
  if (!chosen.inkMuted) {
    if (chosen.ink || surfaceChanged) {
      // Muted text sits between the ink and the surface, as in tokens.json.
      const target =
        lightnessOf(colours.ink) + (lightnessOf(colours.surface) - lightnessOf(colours.ink)) * 0.38
      colours.inkMuted = withLightness(colours.ink, target)
    }
    for (const background of [colours.surface, colours.surfaceAlt]) {
      colours.inkMuted = adjustLightnessForContrast(colours.inkMuted, background, TEXT_RATIO).hex
    }
  }
  if (chosen.ink || surfaceChanged || dark) colours.focus = colours.ink
  if (
    chosen.surfaceInverse &&
    contrastRatio(colours.inkInverse, colours.surfaceInverse) < TEXT_RATIO
  ) {
    colours.inkInverse = readableInk(colours.surfaceInverse)
  }
  if (chosen.surfaceInverse || dark) {
    colours.inkInverseMuted = adjustLightnessForContrast(
      colours.inkInverseMuted,
      colours.surfaceInverse,
      TEXT_RATIO,
    ).hex
  }

  // 4. Brand colours and what is derived from them.
  const brand = (name: string, key: 'primary' | 'secondary' | 'highlight') => {
    const hex = chosen[key]
    if (!hex) return undefined
    const ink = readableInk(hex)
    checks.push({
      id: `${key}-ink`,
      fields: [key],
      label: `Text on ${name}`,
      foreground: ink,
      background: hex,
      ratio: contrastRatio(ink, hex),
      required: TEXT_RATIO,
      pass: contrastRatio(ink, hex) >= TEXT_RATIO,
      adjustable: false,
    })
    return { hex, ink }
  }

  const primary = brand('Primary', 'primary')
  if (primary) {
    // The button and tone colour stays exactly as chosen; only text drawn in the colour is adjusted.
    const text = [colours.surface, colours.surfaceAlt].reduce(
      (current, background) => adjustLightnessForContrast(current, background, TEXT_RATIO).hex,
      primary.hex,
    )
    colours.accent = primary.hex
    colours.accentInk = primary.ink
    colours.accentText = text
    colours.cta = primary.hex
    colours.ctaInk = primary.ink
    // Links and eyebrows sit on the Background and the Alternate background, so the harder of the two
    // is measured: a shade that passes it (what "Use suggested colour" saves) passes both.
    const harder = [colours.surface, colours.surfaceAlt].reduce((worst, background) =>
      contrastRatio(primary.hex, background) < contrastRatio(primary.hex, worst)
        ? background
        : worst,
    )
    checks.push({
      id: 'primary-text',
      fields: ['primary'],
      label: 'Primary as text on the background',
      foreground: primary.hex,
      background: harder,
      ratio: contrastRatio(primary.hex, harder),
      required: TEXT_RATIO,
      pass: text === primary.hex,
      adjustable: true,
    })
  } else if (dark) {
    // The primary button swaps with the surfaces: light on a dark site.
    colours.cta = colours.surfaceInverse
    colours.ctaInk = colours.inkInverse
    colours.accentText = adjustLightnessForContrast(
      colours.accentText,
      colours.surface,
      TEXT_RATIO,
    ).hex
  }
  if (!primary && chosen.surface) {
    colours.accentText = [colours.surface, colours.surfaceAlt].reduce(
      (current, background) => adjustLightnessForContrast(current, background, TEXT_RATIO).hex,
      colours.accentText,
    )
  }

  const secondary = brand('Secondary', 'secondary')
  if (secondary) {
    colours.accent2 = secondary.hex
    colours.accent2Ink = secondary.ink
  }
  const highlight = brand('Highlight', 'highlight')
  if (highlight) {
    colours.highlight = highlight.hex
    colours.highlightInk = highlight.ink
  }

  // 5. Contrast of the text colours on their surfaces (the reported ones are the editor's own choices).
  const pair = (
    id: string,
    fields: string[],
    label: string,
    foreground: string,
    background: string,
    adjustable: boolean,
    explicit = false,
  ) =>
    checks.push({
      id,
      fields,
      label,
      foreground,
      background,
      ratio: contrastRatio(foreground, background),
      required: TEXT_RATIO,
      pass: contrastRatio(foreground, background) >= TEXT_RATIO,
      adjustable,
      explicit,
    })
  if (chosen.ink || chosen.surface || dark) {
    pair(
      'ink-surface',
      ['ink', 'surface'],
      'Text on the background',
      colours.ink,
      colours.surface,
      Boolean(chosen.ink),
      Boolean(chosen.ink && chosen.surface),
    )
  }
  // Tinted sections (`data-tone='alt'`) and cards draw the same Text on the Alternate background.
  if (chosen.ink || chosen.surface || chosen.surfaceAlt || dark) {
    pair(
      'ink-alt',
      ['ink', 'surfaceAlt'],
      'Text on the alternate background',
      colours.ink,
      colours.surfaceAlt,
      Boolean(chosen.ink),
      Boolean(chosen.ink && chosen.surfaceAlt),
    )
  }
  if (chosen.inkMuted || chosen.surface || chosen.surfaceAlt) {
    pair(
      'ink-muted-surface',
      ['inkMuted', 'surface'],
      'Muted text on the background',
      colours.inkMuted,
      colours.surface,
      Boolean(chosen.inkMuted),
      Boolean(chosen.inkMuted && chosen.surface),
    )
    pair(
      'ink-muted-alt',
      ['inkMuted', 'surfaceAlt'],
      'Muted text on the alternate background',
      colours.inkMuted,
      colours.surfaceAlt,
      Boolean(chosen.inkMuted),
      Boolean(chosen.inkMuted && chosen.surfaceAlt),
    )
  }

  // 6. Gradients.
  const vars: Record<string, string> = {}
  for (const gradient of brandGradients(input.gradients)) {
    vars[`--gradient-${gradient.slug}`] = gradient.css
    gradient.stops.forEach((stop, stopIndex) => {
      const ratio = contrastRatio(stop, colours.surface)
      if (ratio < UI_RATIO) {
        warnings.push({
          field: 'gradients',
          message: `Gradient "${gradient.name}", stop ${stopIndex + 1} (${stop}) has only ${ratio.toFixed(1)}:1 against the background, so gradient text in it may be hard to read (aim for ${UI_RATIO}:1 or more).`,
        })
      }
    })
  }

  // 6b. The main button's Brand gradient (task 148). Anything that cannot be drawn with readable text
  // leaves the Solid button and says why in a warning (never an error, as for every derived pair).
  if (input.buttonFill === 'gradient') {
    const slug = input.buttonGradient
    const gradient = brandGradients(input.gradients).find((item) => item.slug === slug)
    if (!gradient) {
      warnings.push({
        field: 'buttonGradient',
        message: slug
          ? 'This gradient is no longer in Advanced, so the main button stays Solid. Choose another gradient.'
          : 'Choose a gradient for the main button. Until then it stays Solid.',
      })
    } else {
      const ink = gradientInk(gradient.stops, TEXT_RATIO)
      if (ink) {
        vars['--button-fill'] = gradient.css
        vars['--button-fill-ink'] = ink.ink
        // Hover and press lay a veil of the colour opposite the text over the gradient. That moves the
        // fill away from the text colour, so the contrast only improves and the text is never touched.
        vars['--button-fill-veil'] = ink.ink === '#ffffff' ? '#000000' : '#ffffff'
        // The button still draws, but where most of the gradient is close to the section behind it the
        // edge disappears (the label alone marks the button). Warn per background, as 216 does for the rest.
        const samples = gradientSamples(gradient.stops)
        for (const [label, background] of [
          ['the page background', colours.surface],
          ['the inverse background', colours.surfaceInverse],
        ] as const) {
          const faint = samples.filter((sample) => contrastRatio(sample, background) < UI_RATIO)
          if (faint.length > samples.length / 2) {
            warnings.push({
              field: 'buttonGradient',
              message: `Most of "${gradient.name}" is under ${UI_RATIO}:1 against ${label}, so a main button on it loses its edge. Choose a gradient that stands out from both backgrounds, or add Depth or Glow.`,
            })
          }
        }
      } else {
        warnings.push({
          field: 'buttonGradient',
          message: `No single text colour reaches ${TEXT_RATIO}:1 along "${gradient.name}" (checked at every stop, each midpoint and between), so the main button stays Solid. Choose a gradient whose colours are all light or all dark.`,
        })
      }
    }
  }

  // 7. Only what differs from tokens.json is emitted.
  for (const key of Object.keys(colours) as (keyof typeof colorHex)[]) {
    if (colours[key] !== base[key]) vars[CSS_VARIABLES[key]] = colours[key]
  }
  if (dark) vars['color-scheme'] = 'dark'
  // Site-wide decisions (density, shape): token variables beyond colour, after the colours so the
  // output of a site that sets none is byte-for-byte what it was.
  Object.assign(vars, siteDecisionVars(input))
  // The main button's depth and glow are one box-shadow list, so the button reads a single variable
  // (and, while neither is chosen, none: the rule then hands back to the button's own classes).
  const buttonShadows = [vars['--button-depth'], vars['--button-glow']].filter(Boolean)
  if (buttonShadows.length > 0) vars['--button-shadow'] = buttonShadows.join(', ')

  const errors: DesignWarning[] = []
  for (const check of checks) {
    const [field] = check.fields
    if (!check.pass && field && check.explicit) {
      // The editor chose both colours, so this is theirs to fix (Studio offers "Use suggested colour").
      errors.push({
        field,
        message: `${check.label}: ${check.ratio.toFixed(1)}:1 on the colours you chose, below the ${check.required}:1 AA minimum for text. Change this colour or the background, or use the suggested colour.`,
      })
    }
  }
  // A field that already has an error is not warned about as well: one suggestion covers every pair.
  const blocked = new Set(errors.map((error) => error.field))
  for (const check of checks) {
    const [field] = check.fields
    if (!check.pass && field && !check.explicit && !blocked.has(field)) {
      warnings.push({
        field,
        message:
          check.id === 'primary-text'
            ? `Primary is ${check.ratio.toFixed(1)}:1 against the background, below the ${check.required}:1 AA minimum for text. Links and eyebrows use ${colours.accentText} instead; buttons and backgrounds keep your colour.`
            : `${check.label}: ${check.ratio.toFixed(1)}:1, below the ${check.required}:1 AA minimum.`,
      })
    }
  }

  const entries = Object.entries(vars)
  return {
    vars,
    css: entries.length
      ? `:root{${entries.map(([name, value]) => `${name}:${value}`).join(';')}}`
      : '',
    checks,
    warnings,
    errors,
    colours,
    accent: { background: colours.accent, foreground: colours.accentInk },
  }
}

/** Whether a surface reads as dark (decides which way its tints and borders step). */
function relativeDark(hex: string): boolean {
  return lightnessOf(hex) < 0.5
}
