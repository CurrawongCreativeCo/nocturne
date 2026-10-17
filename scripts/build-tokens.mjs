import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hexToRgb, oklchToRgb as oklchToRgbChannels } from '../src/lib/color/oklch.ts'

/**
 * Design tokens: src/styles/tokens.json -> src/styles/tokens.generated.css (a Tailwind 4 @theme
 * block plus :root variables) and src/config/tokens.generated.ts (values needed outside CSS).
 * No dependencies, so it runs before `npm ci` finishes anything else: `npm run tokens`.
 * The generated files are committed; CI fails when they are stale.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const paths = {
  source: join(root, 'src/styles/tokens.json'),
  css: join(root, 'src/styles/tokens.generated.css'),
  ts: join(root, 'src/config/tokens.generated.ts'),
}

export const requiredColors = [
  'surface',
  'surface-alt',
  'surface-inverse',
  'ink',
  'ink-muted',
  'ink-inverse',
  'ink-inverse-muted',
  'accent',
  'accent-ink',
  'accent-text',
  'accent-2',
  'accent-2-ink',
  'highlight',
  'highlight-ink',
  'cta',
  'cta-ink',
  'line',
  'line-strong',
  'focus',
  'danger',
  'danger-surface',
  'danger-ink',
  'success',
  'success-surface',
  'success-ink',
  'warning',
  'warning-surface',
  'warning-ink',
]
export const requiredFonts = ['display', 'body', 'mono']
export const requiredTypes = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'small']
export const requiredSpace = [
  'section-y-compact',
  'section-y',
  'section-y-spacious',
  'gutter',
  'measure',
]
export const requiredRadius = ['sm', 'card', 'button', 'pill']
export const requiredShadow = ['card', 'raised']
export const requiredMotion = [
  'duration-fast',
  'duration',
  'duration-slow',
  'ease-out',
  'ease-in-out',
  'reveal-distance',
]

/**
 * Heading emphasis (README, "Highlighting words in a heading"). Optional in tokens.json: a client's
 * older file without the group gets these, so updating the template never breaks `npm run tokens`.
 */
export const defaultEmphasis = {
  'underline-thickness': '0.08em',
  'underline-offset': '0.14em',
  // How much of the accent tints a highlighted phrase (0-1). The Studio contrast check reads it too.
  'highlight-strength': '0.22',
}

export const emphasisOf = (tokens) => ({ ...defaultEmphasis, ...tokens.emphasis })

/**
 * Section divider heights (README, "Section dividers"): how tall the cut at a section's bottom edge
 * is. Fluid, so phones get a smaller one. Optional in tokens.json, like the emphasis group above.
 */
export const defaultEdge = {
  small: 'clamp(1.5rem, 1rem + 2vw, 2.5rem)',
  medium: 'clamp(2.5rem, 1.5rem + 4vw, 5rem)',
  large: 'clamp(4rem, 2rem + 8vw, 9rem)',
}

export const edgeOf = (tokens) => ({ ...defaultEdge, ...tokens.edge })

/**
 * Frosted glass (README, "Link list": Glass rows). How much of the page colour each strength keeps (0-1),
 * the nearly solid surface used where glass can't or shouldn't blur, the blur, the edge's strength
 * and the shadow. Optional in tokens.json, like the groups above. The Studio contrast check reads the
 * strengths too.
 */
export const defaultGlass = {
  light: '0.55',
  medium: '0.7',
  strong: '0.85',
  solid: '0.95',
  blur: '14px',
  border: '0.4',
  'border-hover': '0.75',
  shadow: '0 8px 32px 0 rgb(0 0 0 / 0.12)',
}

export const glassOf = (tokens) => ({ ...defaultGlass, ...tokens.glass })

const glassFractions = ['light', 'medium', 'strong', 'solid', 'border', 'border-hover']

export { hexToRgb }

/** "oklch(0.55 0.2 264)" (or "55% 0.2 264") -> sRGB [r, g, b] (0-255, unrounded, clamped). */
export function oklchToRgb(value) {
  const match = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/.exec(value)
  if (!match) throw new Error(`Not a plain oklch() colour: ${value}`)
  return oklchToRgbChannels(
    Number(match[1]) / (match[2] ? 100 : 1),
    Number(match[3]),
    Number(match[4]),
  )
}

/** How far a hex fallback may drift from its oklch value (per channel, out of 255). */
const HEX_TOLERANCE = 2

const kebabToCamel = (name) => name.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())

function requireKeys(group, name, keys, errors) {
  const object = group ?? {}
  for (const key of keys) {
    if (!(key in object)) errors.push(`${name}.${key} is missing`)
  }
}

/** Returns a list of problems with a parsed tokens.json; empty when it is valid. */
export function validateTokens(tokens) {
  const errors = []
  requireKeys(tokens.color, 'color', requiredColors, errors)
  requireKeys(tokens.font, 'font', requiredFonts, errors)
  requireKeys(tokens.type, 'type', requiredTypes, errors)
  requireKeys(tokens.space, 'space', requiredSpace, errors)
  requireKeys(tokens.radius, 'radius', requiredRadius, errors)
  requireKeys(tokens.shadow, 'shadow', requiredShadow, errors)
  requireKeys(tokens.motion, 'motion', requiredMotion, errors)

  for (const [name, value] of Object.entries(tokens.color ?? {})) {
    if (!/^#[0-9a-f]{6}$/.test(value?.hex ?? '')) {
      errors.push(`color.${name}.hex must be a lowercase #rrggbb value (next/og cannot read oklch)`)
      continue
    }
    try {
      const expected = oklchToRgb(value.oklch ?? '')
      const actual = hexToRgb(value.hex)
      if (expected.some((channel, i) => Math.abs(channel - actual[i]) > HEX_TOLERANCE)) {
        errors.push(`color.${name}: hex ${value.hex} does not match ${value.oklch}`)
      }
    } catch (error) {
      errors.push(`color.${name}.oklch: ${error.message}`)
    }
  }

  for (const [name, value] of Object.entries(tokens.type ?? {})) {
    if (!/^clamp\(.+\)$/.test(value.size ?? '')) errors.push(`type.${name}.size must be a clamp()`)
    for (const key of ['lineHeight', 'letterSpacing']) {
      if (!value[key]) errors.push(`type.${name}.${key} is missing`)
    }
  }

  for (const key of ['duration-fast', 'duration', 'duration-slow', 'marquee-per-logo']) {
    if (tokens.motion?.[key] && Number.isNaN(parseDuration(tokens.motion[key]))) {
      errors.push(`motion.${key} must be a duration such as 150ms or 0.2s`)
    }
  }
  if (tokens.motion?.['ease-out'] && !parseBezier(tokens.motion['ease-out'])) {
    errors.push('motion.ease-out must be a cubic-bezier(x1, y1, x2, y2)')
  }
  if (tokens.motion?.['ease-in-out'] && !parseBezier(tokens.motion['ease-in-out'])) {
    errors.push('motion.ease-in-out must be a cubic-bezier(x1, y1, x2, y2)')
  }
  if (
    tokens.motion?.['reveal-distance'] &&
    Number.isNaN(parseLengthPx(tokens.motion['reveal-distance']))
  ) {
    errors.push('motion.reveal-distance must be px or rem')
  }
  for (const [name, value] of Object.entries(tokens.emphasis ?? {})) {
    if (!(name in defaultEmphasis)) errors.push(`emphasis.${name} is not a known token`)
    else if (typeof value !== 'string') errors.push(`emphasis.${name} must be a string`)
  }
  for (const [name, value] of Object.entries(tokens.edge ?? {})) {
    if (!(name in defaultEdge))
      errors.push(`edge.${name} is not a known token (small, medium, large)`)
    else if (typeof value !== 'string' || !value.trim())
      errors.push(`edge.${name} must be a CSS length`)
  }
  for (const [name, value] of Object.entries(tokens.glass ?? {})) {
    if (!(name in defaultGlass)) errors.push(`glass.${name} is not a known token`)
    else if (typeof value !== 'string' || !value.trim())
      errors.push(`glass.${name} must be a string`)
  }
  const glass = glassOf(tokens)
  for (const name of glassFractions) {
    const fraction = Number(glass[name])
    if (!(fraction > 0 && fraction <= 1)) errors.push(`glass.${name} must be 0-1`)
  }
  if (!(
    Number(glass.light) < Number(glass.medium) && Number(glass.medium) < Number(glass.strong)
  )) {
    errors.push('glass: light, medium and strong must increase')
  }
  if (parseLengthPx(glass.blur) < 12 || parseLengthPx(glass.blur) > 16) {
    errors.push('glass.blur must be 12px to 16px (px or rem)')
  }
  const strength = Number(emphasisOf(tokens)['highlight-strength'])
  if (!(strength > 0 && strength <= 1)) errors.push('emphasis.highlight-strength must be 0-1')
  return errors
}

/** "150ms" / "0.2s" -> seconds. */
export function parseDuration(value) {
  const match = /^([\d.]+)(ms|s)$/.exec(value)
  if (!match) return Number.NaN
  return match[2] === 'ms' ? Number(match[1]) / 1000 : Number(match[1])
}

/** "24px" / "1.5rem" -> pixels. */
export function parseLengthPx(value) {
  const match = /^([\d.]+)(px|rem)$/.exec(value)
  if (!match) return Number.NaN
  return match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1])
}

/** "cubic-bezier(0, 0, 0.2, 1)" -> [0, 0, 0.2, 1], or null. */
export function parseBezier(value) {
  const match = /^cubic-bezier\(\s*([^)]+)\)$/.exec(value)
  const numbers = match?.[1].split(',').map(Number)
  return numbers?.length === 4 && numbers.every((n) => !Number.isNaN(n)) ? numbers : null
}

/**
 * Section tones (SectionFrame, README "Section style"): a `data-tone` element recolours everything
 * inside it by redefining the colour variables the utilities read. They only reference other tokens,
 * so editing tokens.json (or the Studio's Design settings, which override the same variables at :root)
 * re-skins the tones too. `--tone-accent` and `--tone-accent-ink` keep the real accent pair at :root, since
 * a tone can't read the variable it is redefining. Dark tones switch the focus outline to a contrasting ink.
 */
const toneCss = `:root {
  --tone-accent: var(--color-accent);
  --tone-accent-ink: var(--color-accent-ink);
}

@layer base {
  [data-tone='alt'] {
    background-color: var(--color-surface-alt);
  }

  [data-tone='inverse'] {
    --color-surface: var(--color-surface-inverse);
    --color-surface-alt: color-mix(in oklab, var(--color-surface-inverse) 88%, var(--color-ink-inverse));
    --color-ink: var(--color-ink-inverse);
    --color-ink-muted: var(--color-ink-inverse-muted);
    --color-line: color-mix(in oklab, var(--color-ink-inverse) 20%, transparent);
    --color-line-strong: var(--color-ink-inverse-muted);
    --color-accent: color-mix(in oklab, var(--tone-accent) 55%, var(--color-ink-inverse));
    --color-accent-text: var(--color-accent);
    --color-focus: var(--color-ink-inverse);
    background-color: var(--color-surface);
    color: var(--color-ink);
  }

  [data-tone='accent'] {
    --color-surface: var(--tone-accent);
    --color-surface-alt: color-mix(in oklab, var(--tone-accent-ink) 12%, var(--tone-accent));
    --color-ink: var(--tone-accent-ink);
    --color-ink-muted: var(--tone-accent-ink);
    --color-line: color-mix(in oklab, var(--tone-accent-ink) 35%, transparent);
    --color-line-strong: var(--tone-accent-ink);
    --color-accent: var(--tone-accent-ink);
    --color-accent-text: var(--tone-accent-ink);
    --color-accent-ink: var(--tone-accent);
    --color-focus: var(--tone-accent-ink);
    background-color: var(--color-surface);
    color: var(--color-ink);
  }
}
`

/** The glass a Glass rows link sits on. Defined per element (not at :root) so a tone's own surface colour is the one it reads. */
function glassCss(tokens) {
  const glass = glassOf(tokens)
  const percent = (name) => `${String(Math.round(Number(glass[name]) * 1000) / 10)}%`
  const mix = (colour, name) => `color-mix(in oklch, ${colour} ${percent(name)}, transparent)`
  return `@layer base {
  .glass-row {
    --glass-solid: ${mix('var(--color-surface)', 'solid')};
    --glass-border: ${mix('var(--color-ink-inverse)', 'border')};
    --glass-border-hover: ${mix('var(--color-ink-inverse)', 'border-hover')};
    --glass-surface: ${mix('var(--color-surface)', 'medium')};
  }

  .glass-row-light {
    --glass-surface: ${mix('var(--color-surface)', 'light')};
  }

  .glass-row-strong {
    --glass-surface: ${mix('var(--color-surface)', 'strong')};
  }
}
`
}

const banner = (source) =>
  `GENERATED by scripts/build-tokens.mjs from ${source}. Do not edit: change tokens.json and run \`npm run tokens\`.`

/** Space tokens land in the Tailwind namespace that gives them the right utilities. */
function spaceVariable(name) {
  if (name === 'measure' || name.startsWith('measure-') || name.startsWith('content')) {
    return `--container-${name}` // max-w-measure
  }
  if (name.startsWith('section-y')) return `--spacing-${name.replace('-y', '')}` // py-section
  return `--spacing-${name}` // px-gutter
}

export function buildCss(tokens) {
  const lines = []
  const theme = (name, value) => lines.push(`  ${name}: ${value};`)

  lines.push(`/* ${banner('src/styles/tokens.json')} */`, '', '@theme static {')

  for (const [name, value] of Object.entries(tokens.color)) theme(`--color-${name}`, value.oklch)
  lines.push('', '  /* Deprecated aliases: older custom code that uses bg-brand keeps working. */')
  theme('--color-brand', 'var(--color-accent)')
  theme('--color-brand-foreground', 'var(--color-accent-ink)')

  lines.push('')
  for (const [name, value] of Object.entries(tokens.font)) theme(`--font-${name}`, value)
  theme('--font-sans', 'var(--font-body)')

  lines.push('')
  for (const [name, value] of Object.entries(tokens.type)) {
    theme(`--text-${name}`, value.size)
    theme(`--text-${name}--line-height`, value.lineHeight)
    theme(`--text-${name}--letter-spacing`, value.letterSpacing)
  }

  lines.push('')
  for (const [name, value] of Object.entries(tokens.space)) theme(spaceVariable(name), value)

  lines.push('')
  for (const [name, value] of Object.entries(tokens.radius)) theme(`--radius-${name}`, value)
  for (const [name, value] of Object.entries(tokens.shadow)) theme(`--shadow-${name}`, value)

  lines.push('')
  for (const [name, value] of Object.entries(tokens.motion)) {
    if (name.startsWith('ease-')) theme(`--${name}`, value)
  }
  lines.push('}', '', ':root {')
  for (const [name, value] of Object.entries(tokens.motion)) {
    if (!name.startsWith('ease-')) theme(`--${name}`, value)
  }
  lines.push('')
  for (const [name, value] of Object.entries(emphasisOf(tokens))) theme(`--emphasis-${name}`, value)
  lines.push('')
  for (const [name, value] of Object.entries(edgeOf(tokens))) theme(`--edge-height-${name}`, value)
  lines.push('')
  theme('--glass-blur', glassOf(tokens).blur)
  theme('--glass-shadow', glassOf(tokens).shadow)
  lines.push('}', '', toneCss, glassCss(tokens))
  return lines.join('\n')
}

export function buildTs(tokens) {
  const camelKeys = (entries) =>
    Object.fromEntries(entries.map(([name, value]) => [kebabToCamel(name), value]))
  const colors = Object.entries(tokens.color)
  const motion = tokens.motion

  const data = {
    colorOklch: camelKeys(colors.map(([name, value]) => [name, value.oklch])),
    colorHex: camelKeys(colors.map(([name, value]) => [name, value.hex])),
    motion: {
      durationFast: parseDuration(motion['duration-fast']),
      duration: parseDuration(motion.duration),
      durationSlow: parseDuration(motion['duration-slow']),
      easeOut: parseBezier(motion['ease-out']),
      easeInOut: parseBezier(motion['ease-in-out']),
      revealDistance: parseLengthPx(motion['reveal-distance']),
    },
    emphasis: { highlightStrength: Number(emphasisOf(tokens)['highlight-strength']) },
    glass: {
      light: Number(glassOf(tokens).light),
      medium: Number(glassOf(tokens).medium),
      strong: Number(glassOf(tokens).strong),
    },
    ogImage: { background: tokens.color.accent.hex, foreground: tokens.color['accent-ink'].hex },
  }

  const docs = {
    colorOklch: 'Every colour token in oklch: what the CSS variables hold.',
    colorHex:
      'Every colour token as hex, for code that cannot read oklch (next/og, canvas, e-mail).',
    motion:
      'Motion tokens for JavaScript: durations in seconds, easings as cubic-bezier points, distance in px.',
    emphasis:
      'Heading emphasis values the Studio contrast check needs (the CSS reads the variables).',
    glass:
      'How much of the page colour each Glass rows strength keeps (0-1), for the Studio contrast check (the CSS reads the variables).',
    ogImage: 'Colours for the generated share image (src/app/api/og): hex, as next/og needs.',
  }

  const out = [`// ${banner('src/styles/tokens.json')}`, '']
  for (const [name, value] of Object.entries(data)) {
    out.push(
      `/** ${docs[name]} */`,
      `export const ${name} = ${JSON.stringify(value, null, 2)} as const`,
      '',
    )
  }
  return out.join('\n')
}

export function readTokens() {
  return JSON.parse(readFileSync(paths.source, 'utf8'))
}

/** Reads tokens.json, validates it and returns the two generated files' contents. */
export function build() {
  const tokens = readTokens()
  const errors = validateTokens(tokens)
  if (errors.length > 0) {
    throw new Error(`src/styles/tokens.json is invalid:\n- ${errors.join('\n- ')}`)
  }
  return { css: buildCss(tokens), ts: buildTs(tokens) }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { css, ts } = build()
    writeFileSync(paths.css, css)
    writeFileSync(paths.ts, ts)
    console.log('Design tokens: wrote tokens.generated.css and tokens.generated.ts')
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
