/**
 * Builds the Studio's editor guide for this site: src/features/studio/start-here/editor-guide.generated.json.
 *
 * Reads
 *   - docs/editor-guide/*.md        the task guides, written once in the template
 *   - site.profile.ts               which features are on, and which sections clients may add
 *   - schema.json                   which types and fields exist (run after `sanity schema extract`)
 *   - the section schemas           titles, descriptions, image sizes and length limits, which
 *                                   schema.json does not hold
 *
 * `npm run typegen` runs it; CI runs typegen and fails when the committed file differs. Use
 * `npm run editor-guide -- --check` to see whether the file is current without writing it.
 * Video links are not baked in: the Help tab reads them from site.profile.ts at run time.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { buildEditorGuide, parseGuide } from './editor-guide-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const guidesDir = join(root, 'docs', 'editor-guide')
const outFile = join(root, 'src', 'features', 'studio', 'start-here', 'editor-guide.generated.json')

// The section schemas are TypeScript (some with JSX icons) and use the `@/` alias.
const jiti = createJiti(import.meta.url, {
  alias: { '@': join(root, 'src') },
  interopDefault: true,
  jsx: { runtime: 'automatic' },
})

const { siteProfile } = await jiti.import(join(root, 'src/config/profile.ts'))
const { resolveClientSections } = await jiti.import(join(root, 'src/features/studio/roles.ts'))
const { hiddenFromClients } = await jiti.import(join(root, 'src/lib/sanity/roles.ts'))
const { sectionTypes } = await jiti.import(
  join(root, 'src/features/pages/schemas/sections/index.ts'),
)

if (!existsSync(join(root, 'schema.json'))) {
  console.error('schema.json is missing. Run `npm run typegen` (it extracts the schema first).')
  process.exit(1)
}
const schemaJson = JSON.parse(readFileSync(join(root, 'schema.json'), 'utf8'))

const guides = readdirSync(guidesDir)
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((name) => parseGuide(name, readFileSync(join(guidesDir, name), 'utf8')))

const guide = buildEditorGuide({
  guides,
  sectionTypes,
  schemaJson,
  features: siteProfile.features,
  clientSections: resolveClientSections(siteProfile.clientSections),
  agencyOnly: hiddenFromClients,
})

const next = `${JSON.stringify(guide, null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : ''
  if (current !== next) {
    console.error('The editor guide is stale. Run `npm run typegen` and commit the result.')
    process.exit(1)
  }
  console.log('The editor guide is current.')
} else {
  writeFileSync(outFile, next)
  console.log(
    `Editor guide: ${guide.guides.length} guides, ${guide.sections.length} sections written.`,
  )
}
