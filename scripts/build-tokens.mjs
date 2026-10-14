import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

/** "#rrggbb" -> [r, g, b] (0-255). */
export function hexToRgb(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
}

/** "oklch(0.55 0.2 264)" (or "55% 0.2 264") -> sRGB [r, g, b] (0-255, unrounded, clamped). */
export function oklchToRgb(value) {
  const match = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/.exec(value)
  if (!match) throw new Error(`Not a plain oklch() colour: ${value}`)
  const lightness = Number(match[1]) / (match[2] ? 100 : 1)
  const chroma = Number(match[3])
  const hue = (Number(match[4]) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel))
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return encoded * 255
  })
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

  for (const key of ['duration-fast', 'duration', 'duration-slow']) {
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
  lines.push('}', '')
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
    ogImage: { background: tokens.color.accent.hex, foreground: tokens.color['accent-ink'].hex },
    studioBrand: {
      color: tokens.color.accent.oklch,
      foreground: tokens.color['accent-ink'].oklch,
    },
  }

  const docs = {
    colorOklch: 'Every colour token in oklch: what the CSS variables hold.',
    colorHex:
      'Every colour token as hex, for code that cannot read oklch (next/og, canvas, e-mail).',
    motion:
      'Motion tokens for JavaScript: durations in seconds, easings as cubic-bezier points, distance in px.',
    ogImage: 'Colours for the generated share image (src/app/api/og): hex, as next/og needs.',
    studioBrand: "Colours for the embedded Studio's chrome (its logo mark): oklch.",
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
