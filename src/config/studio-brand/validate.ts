import type { StudioBrandFile } from './types.ts'

/** The only place a client's CMS logo files may live. */
export const CLIENT_ASSET_DIR = 'src/assets/brand/client/'

const HEX = /^#[0-9a-fA-F]{6}$/
const LOGO_EXTENSION = /\.(svg|png|webp|jpe?g|avif)$/i
const TOP_LEVEL_KEYS = ['name', 'logo', 'colors']
const LOGO_KEYS = ['onLight', 'onDark', 'mark']
const COLOR_KEYS = ['primary', 'secondary']

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function unknownKeys(object: Record<string, unknown>, allowed: string[], where: string): string[] {
  return Object.keys(object)
    .filter((key) => !allowed.includes(key))
    .map((key) => `${where}${key} is not a known field (expected ${allowed.join(', ')})`)
}

function checkLogoPath(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim() === '') return `${field} must be a file path`
  if (value.includes('\\')) return `${field} must use forward slashes: "${value}"`
  if (value.split('/').includes('..')) return `${field} must not contain "..": "${value}"`
  if (!value.startsWith(CLIENT_ASSET_DIR) || value.length === CLIENT_ASSET_DIR.length) {
    return `${field} must be a file inside ${CLIENT_ASSET_DIR} (got "${value}")`
  }
  if (!LOGO_EXTENSION.test(value)) {
    return `${field} must be an svg, png, webp, jpg or avif file (got "${value}")`
  }
  return null
}

export type ValidationResult =
  { ok: true; brand: StudioBrandFile } | { ok: false; errors: string[] }

/**
 * Checks a parsed studio-brand.json. Dependency-free; every error names the field and says what to
 * change. `fileExists` is optional: pass it to also check that each logo file is on disk (the check
 * script does; the unit tests stay pure).
 */
export function validateStudioBrand(
  value: unknown,
  fileExists?: (path: string) => boolean,
): ValidationResult {
  if (!isObject(value)) {
    return {
      ok: false,
      errors: ['studio-brand.json must be a JSON object; use {} for the default'],
    }
  }
  const errors = unknownKeys(value, TOP_LEVEL_KEYS, '')

  if (value.name !== undefined && (typeof value.name !== 'string' || value.name.trim() === '')) {
    errors.push('name must be a non-empty string')
  }

  if (value.logo !== undefined) {
    if (!isObject(value.logo)) {
      errors.push('logo must be an object with onLight, onDark and/or mark')
    } else {
      errors.push(...unknownKeys(value.logo, LOGO_KEYS, 'logo.'))
      for (const key of LOGO_KEYS) {
        const path = value.logo[key]
        if (path === undefined) continue
        const problem = checkLogoPath(path, `logo.${key}`)
        if (problem) errors.push(problem)
        else if (fileExists && !fileExists(path as string)) {
          errors.push(`logo.${key}: no file at ${path as string}`)
        }
      }
    }
  }

  if (value.colors !== undefined) {
    if (!isObject(value.colors)) {
      errors.push('colors must be an object with primary and/or secondary')
    } else {
      errors.push(...unknownKeys(value.colors, COLOR_KEYS, 'colors.'))
      for (const key of COLOR_KEYS) {
        const colour = value.colors[key]
        if (colour === undefined) continue
        if (typeof colour !== 'string' || !HEX.test(colour)) {
          errors.push(
            `colors.${key} must be a six-digit hex colour such as #1a73e8 (got ${JSON.stringify(colour)})`,
          )
        }
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, brand: value }
}
