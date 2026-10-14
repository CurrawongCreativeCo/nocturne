import type {
  LogoAsset,
  LogoVariants,
  Scheme,
  StudioBrand,
  StudioBrandDefaults,
  StudioBrandEnv,
  StudioBrandFile,
  StudioBrandRoles,
  StudioBrandWarning,
} from './types.ts'
import { adjustLightnessForContrast, contrastRatio } from '../../lib/color/contrast.ts'
import { hexToOklch, oklchToHex } from '../../lib/color/oklch.ts'

const TEXT_CONTRAST = 4.5
const NON_TEXT_CONTRAST = 3

/**
 * Sanity's own default neutrals (approximate), the base the client palettes are tinted from.
 * Nothing here is a Currawong colour.
 */
const SANITY_NEUTRALS = {
  light: { background: '#ffffff', text: '#101112', surface: '#f2f3f5', border: '#8a8d93' },
  dark: { background: '#101112', text: '#ffffff', surface: '#1b1d20', border: '#7a7d83' },
} as const

/** Most chroma a neutral gets, and the share of the client's own chroma it follows (so greys stay grey). */
const MAX_TINT_CHROMA = 0.014
const TINT_SHARE = 0.25
/** Pure white has no room for chroma, so tinted neutrals stop just short of it. */
const MAX_NEUTRAL_LIGHTNESS = 0.985
/** How far a derived secondary moves from the primary's OKLCH lightness. */
const SECONDARY_LIGHTNESS_SHIFT = 0.22

interface Tint {
  hue: number
  chroma: number
}

const tintNeutral = (hex: string, { hue, chroma }: Tint): string => {
  const { l } = hexToOklch(hex)
  return oklchToHex({ l: Math.min(l, MAX_NEUTRAL_LIGHTNESS), c: chroma, h: hue })
}

/** A secondary from a primary: same hue and chroma, lightness moved away from the middle. */
function deriveCompanion(hex: string): string {
  const { l, c, h } = hexToOklch(hex)
  const shifted = l > 0.6 ? l - SECONDARY_LIGHTNESS_SHIFT : l + SECONDARY_LIGHTNESS_SHIFT
  return oklchToHex({ l: Math.min(0.92, Math.max(0.15, shifted)), c, h })
}

/** The first candidate that reads at 4.5:1 on `fill`; if none does, whichever is best, else black or white. */
function readableOn(fill: string, candidates: string[]): string {
  const passing = candidates.find((candidate) => contrastRatio(candidate, fill) >= TEXT_CONTRAST)
  if (passing) return passing
  return contrastRatio('#000000', fill) >= contrastRatio('#ffffff', fill) ? '#000000' : '#ffffff'
}

interface ClientColours {
  primary: string
  secondary: string
  secondaryDerived: boolean
}

function clientRoles(
  scheme: Scheme,
  colours: ClientColours,
  warnings: StudioBrandWarning[],
): StudioBrandRoles {
  const neutrals = SANITY_NEUTRALS[scheme]
  const { c, h } = hexToOklch(colours.primary)
  const tint: Tint = { hue: h, chroma: Math.min(MAX_TINT_CHROMA, c * TINT_SHARE) }

  const background = tintNeutral(neutrals.background, tint)
  const text = tintNeutral(neutrals.text, tint)
  const surface = tintNeutral(neutrals.surface, tint)
  // The border is a tinted neutral nudged until it reads at 3:1 on the surface (and so on the background).
  const surfaceBorder = adjustLightnessForContrast(
    tintNeutral(neutrals.border, tint),
    surface,
    NON_TEXT_CONTRAST,
  ).hex

  /** A client colour used as text or a focus ring: lifted to `min` on the background, with a warning. */
  const guard = (
    role: 'accentText' | 'focus' | 'highlightText',
    colour: 'primary' | 'secondary',
    min: number,
  ): string => {
    const original = colours[colour]
    const result = adjustLightnessForContrast(original, background, min)
    if (result.adjusted) {
      const derived = colour === 'secondary' && colours.secondaryDerived ? ' (derived)' : ''
      warnings.push({
        scheme,
        role,
        colour,
        from: original,
        to: result.hex,
        required: min,
        message: `Studio ${scheme} mode: ${colour}${derived} ${original} is ${contrastRatio(original, background).toFixed(1)}:1 on ${background}, below the ${min}:1 needed for ${role}; using ${result.hex} (${result.ratio.toFixed(1)}:1) for it. The exact colour stays on fills and logos.`,
      })
    }
    return result.hex
  }

  const onFill = (fill: string) => readableOn(fill, [text, background])

  return {
    background,
    text,
    surface,
    surfaceBorder,
    accentFill: colours.primary,
    onAccent: onFill(colours.primary),
    accentText: guard('accentText', 'primary', TEXT_CONTRAST),
    focus: guard('focus', 'primary', NON_TEXT_CONTRAST),
    highlightFill: colours.secondary,
    onHighlight: onFill(colours.secondary),
    highlightText: guard('highlightText', 'secondary', TEXT_CONTRAST),
  }
}

const firstLetter = (name: string): string => Array.from(name.trim())[0]?.toUpperCase() ?? '?'

const same = (asset: LogoAsset): LogoVariants => ({ light: asset, dark: asset })

/**
 * Resolves the Studio's brand from studio-brand.json (`client`), Currawong's defaults and the
 * environment. Pure: nothing is read from disk or process.env here.
 *
 * - Client branding always wins; Currawong only fills gaps.
 * - Identity falls back field by field: the logo, then the name.
 * - Colours fall back as a whole set: any client colour means the whole palette is the client's.
 * - Client colours used as text, focus or selected states are lifted to the WCAG contrast they
 *   need, with a warning; fills and logos keep the exact value.
 */
export function resolveStudioBrand(
  client: StudioBrandFile,
  defaults: StudioBrandDefaults,
  env: StudioBrandEnv = {},
): StudioBrand {
  const warnings: StudioBrandWarning[] = []
  const clientName = client.name?.trim()
  const envTitle = env.studioTitle?.trim()
  const name = clientName || envTitle || defaults.name

  const primary = client.colors?.primary?.toLowerCase()
  const secondary = client.colors?.secondary?.toLowerCase()
  const seed = primary ?? secondary
  const hasColours = Boolean(seed)

  let light = defaults.light
  let dark = defaults.dark
  let colours: ClientColours | undefined
  if (seed) {
    // A lone colour stands in for the missing one: derived, never taken from Currawong.
    const resolvedPrimary = primary ?? deriveCompanion(seed)
    colours = {
      primary: resolvedPrimary,
      secondary: secondary ?? deriveCompanion(resolvedPrimary),
      secondaryDerived: !secondary,
    }
    light = clientRoles('light', colours, warnings)
    dark = clientRoles('dark', colours, warnings)
  }

  const monogram = (scheme: Scheme): LogoAsset | undefined =>
    colours
      ? {
          kind: 'monogram',
          text: firstLetter(name),
          background: colours.primary,
          foreground: (scheme === 'light' ? light : dark).onAccent,
        }
      : undefined

  const logoFiles = client.logo ?? {}
  const imageOf = (src: string | undefined): LogoAsset | undefined =>
    src ? { kind: 'image', src } : undefined
  const clientLogoLight = imageOf(logoFiles.onLight ?? logoFiles.onDark)
  const clientLogoDark = imageOf(logoFiles.onDark ?? logoFiles.onLight)
  const clientMark = imageOf(logoFiles.mark)

  const logo: LogoVariants = {
    light: clientLogoLight ?? monogram('light') ?? defaults.logo.light,
    dark: clientLogoDark ?? monogram('dark') ?? defaults.logo.dark,
  }
  // A mark falls back to the client's own logo before any monogram or Currawong mark.
  const mark: LogoVariants = clientMark
    ? same(clientMark)
    : {
        light: clientLogoLight ?? monogram('light') ?? defaults.mark.light,
        dark: clientLogoDark ?? monogram('dark') ?? defaults.mark.dark,
      }

  const logoSource = clientLogoLight ? 'client' : colours ? 'monogram' : 'currawong'
  const logoDrawnFor: Scheme | null =
    logoFiles.onLight && !logoFiles.onDark
      ? 'light'
      : logoFiles.onDark && !logoFiles.onLight
        ? 'dark'
        : null

  const source = clientName || hasColours || clientLogoLight || clientMark ? 'client' : 'currawong'
  return { source, name, logo, mark, logoSource, logoDrawnFor, light, dark, warnings }
}
