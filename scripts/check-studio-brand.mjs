/**
 * Prints the CMS brand this site's Studio resolves to, and fails when studio-brand.json is invalid
 * (bad hex, a logo path outside src/assets/brand/client/, a missing file). Contrast adjustments are
 * warnings, not failures. Run with `npm run check:studio-brand`; CI runs it too. Reads only
 * studio-brand.json and process.env.NEXT_PUBLIC_STUDIO_TITLE; Node strips the TypeScript types.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { currawongBrand } from '../src/config/studio-brand/currawong.ts'
import { resolveStudioBrand } from '../src/config/studio-brand/resolve.ts'
import { CONTRAST_RULES } from '../src/config/studio-brand/types.ts'
import { validateStudioBrand } from '../src/config/studio-brand/validate.ts'
import { contrastRatio } from '../src/lib/color/contrast.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const describeLogo = (asset) =>
  asset.kind === 'image' ? asset.src : `monogram "${asset.text}" on ${asset.background}`

function printRoles(scheme, roles) {
  console.log(`\n${scheme} mode`)
  for (const [role, hex] of Object.entries(roles)) console.log(`  ${role.padEnd(14)} ${hex}`)
  for (const rule of CONTRAST_RULES) {
    const ratio = contrastRatio(roles[rule.foreground], roles[rule.background])
    const mark = ratio >= rule.min ? 'ok  ' : 'FAIL'
    console.log(
      `  ${mark} ${rule.foreground} on ${rule.background}: ${ratio.toFixed(1)}:1 (needs ${rule.min}:1, ${rule.use})`,
    )
  }
}

let raw
try {
  raw = JSON.parse(readFileSync(join(root, 'studio-brand.json'), 'utf8'))
} catch (error) {
  console.error(`studio-brand.json could not be read as JSON: ${error.message}`)
  process.exit(1)
}

const validation = validateStudioBrand(raw, (path) => existsSync(join(root, path)))
if (!validation.ok) {
  console.error('studio-brand.json is invalid:')
  for (const error of validation.errors) console.error(`- ${error}`)
  process.exit(1)
}

const brand = resolveStudioBrand(validation.brand, currawongBrand, {
  studioTitle: process.env.NEXT_PUBLIC_STUDIO_TITLE,
})

console.log(`CMS brand source: ${brand.source}`)
console.log(`Name: ${brand.name}`)
console.log(`Logo (light): ${describeLogo(brand.logo.light)}`)
console.log(`Logo (dark): ${describeLogo(brand.logo.dark)}`)
console.log(`Mark (light): ${describeLogo(brand.mark.light)}`)
console.log(`Mark (dark): ${describeLogo(brand.mark.dark)}`)
printRoles('Light', brand.light)
printRoles('Dark', brand.dark)

if (brand.warnings.length === 0) {
  console.log('\nNo warnings.')
} else {
  console.log(`\n${brand.warnings.length} warning(s):`)
  for (const warning of brand.warnings) console.log(`- ${warning.message}`)
}
