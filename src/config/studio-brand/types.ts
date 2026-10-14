/**
 * Types and contrast rules for the CMS (Studio) brand. Kept free of runtime imports: the check script
 * loads these modules directly with Node's TypeScript stripping, so use `import type` for types.
 */

export type Scheme = 'light' | 'dark'

/** The colours the Studio theme is built from. Every value is a lowercase "#rrggbb". */
export const ROLE_NAMES = [
  'background',
  'text',
  'surface',
  'surfaceBorder',
  'accentFill',
  'onAccent',
  'accentText',
  'focus',
  'highlightFill',
  'onHighlight',
  'highlightText',
] as const

export type RoleName = (typeof ROLE_NAMES)[number]

export type StudioBrandRoles = Record<RoleName, string>

/** A pair that must keep at least `min` contrast in both schemes (4.5 for text, 3 for non-text UI). */
export interface ContrastRule {
  foreground: RoleName
  background: RoleName
  min: number
  use: string
}

export const CONTRAST_RULES: readonly ContrastRule[] = [
  { foreground: 'text', background: 'background', min: 4.5, use: 'body text' },
  { foreground: 'text', background: 'surface', min: 4.5, use: 'text on a subtle surface' },
  { foreground: 'accentText', background: 'background', min: 4.5, use: 'accent-coloured text' },
  { foreground: 'focus', background: 'background', min: 3, use: 'focus rings, selected states' },
  { foreground: 'onAccent', background: 'accentFill', min: 4.5, use: 'text on an accent fill' },
  { foreground: 'surfaceBorder', background: 'background', min: 3, use: 'surface borders' },
  { foreground: 'surfaceBorder', background: 'surface', min: 3, use: 'surface borders' },
  {
    foreground: 'highlightText',
    background: 'background',
    min: 4.5,
    use: 'highlight-coloured text',
  },
  { foreground: 'onHighlight', background: 'highlightFill', min: 4.5, use: 'text on a highlight' },
]

/** The shape of studio-brand.json at the repo root. Every field is optional; `{}` means Currawong. */
export interface StudioBrandFile {
  /** Editor hint only (autocomplete and validation); never read by the resolver. */
  $schema?: string
  name?: string
  logo?: {
    /** Path inside src/assets/brand/client/, for a light background. */
    onLight?: string
    /** Path inside src/assets/brand/client/, for a dark background. */
    onDark?: string
    /** A compact square mark, for small spaces. */
    mark?: string
  }
  colors?: {
    primary?: string
    secondary?: string
  }
}

export type LogoAsset =
  | { kind: 'image'; src: string }
  | { kind: 'monogram'; text: string; background: string; foreground: string }

export interface LogoVariants {
  light: LogoAsset
  dark: LogoAsset
}

/** Currawong's fixed brand: its name, logo files and ready-made role colours. */
export interface StudioBrandDefaults {
  name: string
  logo: LogoVariants
  mark: LogoVariants
  light: StudioBrandRoles
  dark: StudioBrandRoles
}

/** Environment values the resolver reads; pass them in so the resolver stays pure. */
export interface StudioBrandEnv {
  /** NEXT_PUBLIC_STUDIO_TITLE */
  studioTitle?: string
}

export interface StudioBrandWarning {
  scheme: Scheme
  role: RoleName
  /** Which client colour was adjusted. */
  colour: 'primary' | 'secondary'
  from: string
  to: string
  /** The contrast the colour needed against the scheme's background. */
  required: number
  message: string
}

export interface StudioBrand {
  /** 'client' as soon as studio-brand.json sets anything; otherwise 'currawong'. */
  source: 'currawong' | 'client'
  name: string
  logo: LogoVariants
  mark: LogoVariants
  /** Where `logo` came from: the client's file, a monogram from their colours, or Currawong's. */
  logoSource: 'client' | 'monogram' | 'currawong'
  /** When the client supplied only one logo file, the scheme it was drawn for; else null. */
  logoDrawnFor: Scheme | null
  light: StudioBrandRoles
  dark: StudioBrandRoles
  warnings: StudioBrandWarning[]
}
