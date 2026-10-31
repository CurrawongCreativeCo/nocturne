/**
 * Builds design-manifest.generated.json at the repo root: what the Design Engine supports (section
 * types, fields, allowed values, presets, layout rules, who can edit what, token names), read from
 * the schemas themselves so it can never describe something that does not exist.
 *
 * Reads
 *   - the section schemas and the shared types      fields, option lists, presets, options.manifest
 *   - the section rules registry                    evaluated once per layout (registerSectionRules)
 *   - src/lib/sanity/client-editable.ts             who can edit each field
 *   - schema.json                                   which fields are required
 *   - src/styles/tokens.json                        token names
 *
 * `npm run typegen` runs it; CI runs typegen and fails when the committed file differs. Use
 * `npm run design-manifest -- --check` to see whether the file is current without writing it.
 * It is documentation for tools: nothing in src/app may import it (README, "Design manifest").
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { buildDesignManifest } from './design-manifest-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// `--out <file>` writes (or checks) another file; the tests use it.
const outArg = process.argv.indexOf('--out')
const outFile =
  outArg > -1 ? process.argv[outArg + 1] : join(root, 'design-manifest.generated.json')

const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
  jsx: { runtime: 'automatic' },
})

const { sectionTypes } = await jiti.import(
  join(root, 'src/features/pages/schemas/sections/index.ts'),
)

// The shared types sections reference by name. Imported one by one rather than through
// schema/index.ts, which also pulls in the SEO type and its Studio code (and so needs env vars).
const sharedFiles = [
  'link',
  'cta',
  'block-content',
  'heading-text',
  'stats',
  'badge-row',
  'logo-row',
  'launch-date',
  'image-design',
  'decorative-divider',
]
const sharedTypes = []
for (const name of sharedFiles) {
  const exported = await jiti.import(join(root, 'src/lib/sanity/schema', `${name}.ts`))
  sharedTypes.push(...Object.values(exported).filter((value) => value?.name && value?.type))
}
const { sectionStyle } = await jiti.import(join(root, 'src/lib/sanity/schema/section-style.ts'))
const { sectionRulesFor } = await jiti.import(join(root, 'src/lib/sanity/schema/section-form.ts'))
const { designSettings } = await jiti.import(
  join(root, 'src/features/site/schemas/design-settings.ts'),
)
const slots = await jiti.import(join(root, 'src/features/pages/slots/registry.ts'))
const { slotImage } = await jiti.import(join(root, 'src/features/pages/schemas/slot-image.ts'))
const { slotVideo } = await jiti.import(join(root, 'src/features/pages/schemas/slot-video.ts'))
const { isClientEditable } = await jiti.import(join(root, 'src/lib/sanity/client-editable.ts'))

if (!existsSync(join(root, 'schema.json'))) {
  console.error('schema.json is missing. Run `npm run typegen` (it extracts the schema first).')
  process.exit(1)
}

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

// A section's exported LIMITS (field name to longest text). Sections that keep theirs private have none.
const limitsByType = {}
for (const section of sectionTypes) {
  const file = join(root, 'src/features/pages/schemas/sections', `${kebab(section.name)}.ts`)
  if (!existsSync(file)) continue
  const exported = await jiti.import(file)
  if (exported.LIMITS) limitsByType[section.name] = exported.LIMITS
}

let manifest
try {
  manifest = buildDesignManifest({
    version: JSON.parse(readFileSync(join(root, 'template-version.json'), 'utf8')).version,
    sectionTypes,
    sharedTypes: [...sharedTypes, slotImage, slotVideo],
    slots,
    sectionStyle,
    designSettings,
    tokens: JSON.parse(readFileSync(join(root, 'src/styles/tokens.json'), 'utf8')),
    schemaJson: JSON.parse(readFileSync(join(root, 'schema.json'), 'utf8')),
    rulesFor: sectionRulesFor,
    isClientEditable,
    limitsFor: (type) => limitsByType[type],
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const next = `${JSON.stringify(manifest, null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : ''
  if (current !== next) {
    console.error('The design manifest is stale. Run `npm run typegen` and commit the result.')
    process.exit(1)
  }
  console.log('The design manifest is current.')
} else {
  writeFileSync(outFile, next)
  console.log(`Design manifest: ${manifest.sections.length} sections written.`)
}
