/**
 * Scaffolds a page-builder section end to end:
 *
 *   npm run new:section pricing-table
 *
 * Creates the schema, GROQ fragment, React component and insert-menu thumbnail,
 * registers each one at the `// new-section:*` markers, adds a placeholder to the section gallery's
 * fixture page, then runs typegen.
 * The new section starts with a title and text field plus the shared Design options (`style`);
 * edit the four files to shape it.
 *
 *   npm run new:section pricing-table -- --variants cards,table,compact
 *
 * With `--variants` (two to four, the first being the default) the component becomes a folder: a
 * dispatcher (`index.tsx`) and one component per variant, and the schema gets the `variant` field.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseSectionArgs, toSectionNames } from './section-names.mjs'
import {
  componentTemplate,
  dispatcherTemplate,
  fragmentTemplate,
  galleryTemplate,
  schemaTemplate,
  variantComponentTemplate,
} from './section-templates.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const feature = join(root, 'src/features/pages')

const USAGE =
  'Usage: npm run new:section <name> [-- --variants a,b,c]   e.g. npm run new:section pricing-table'
const parsed = parseSectionArgs(process.argv.slice(2))
if (parsed.error) exit(parsed.error)
const { input, variants } = parsed
if (!input) exit(USAGE)

const names = toSectionNames(input)
if (!names) exit(`"${input}" isn't a usable name. Start with a letter, e.g. "pricing-table".`)
const { kebab, typeName, Component, title } = names

const paths = {
  schema: join(feature, 'schemas/sections', `${kebab}.ts`),
  registry: join(feature, 'schemas/sections/index.ts'),
  fragments: join(feature, 'api/sections.ts'),
  // A section with variants is a folder; the renderer's './sections/<kebab>' import finds its index.tsx.
  component: join(feature, 'components/sections', variants.length ? kebab : `${kebab}.tsx`),
  renderer: join(feature, 'components/section-renderer.tsx'),
  preview: join(root, 'public/section-previews', `${typeName}.svg`),
  placeholder: join(root, 'public/section-previews/_placeholder.svg'),
  fixtures: join(root, 'tests/e2e/fixtures/dataset.mjs'),
}

if (
  existsSync(paths.schema) ||
  existsSync(paths.component) ||
  existsSync(`${paths.component}.tsx`) ||
  existsSync(join(feature, 'components/sections', kebab, 'index.tsx'))
)
  exit(`A section called "${kebab}" already exists.`)
if (readFileSync(paths.registry, 'utf8').match(new RegExp(`\\b${typeName}\\b`))) {
  exit(`"${typeName}" is already registered in ${rel(paths.registry)}.`)
}

// Check every insertion point before writing anything, so a failure leaves no half-made section.
const PAGE_BUILDER_TAIL = '  _type\n`\n'
const edits = [
  [paths.registry, '// new-section:import', `import { ${typeName} } from './${kebab}'\n`],
  [paths.registry, '  // new-section:register', `  ${typeName},\n`],
  [paths.fragments, '// new-section:fragment', fragmentTemplate(names, variants)],
  [paths.fragments, PAGE_BUILDER_TAIL, `  \${${typeName}Fragment},\n`],
  [paths.renderer, '// new-section:import', `import { ${Component} } from './sections/${kebab}'\n`],
  [paths.renderer, '  // new-section:register', `  ${typeName}: ${Component},\n`],
  [paths.fixtures, '  // new-section:gallery', galleryTemplate(names, variants)],
]
for (const [file, marker] of edits) {
  if (!readFileSync(file, 'utf8').includes(marker)) {
    exit(
      `Couldn't find the "${marker.trim()}" marker in ${rel(file)}. Restore it, or add the section by hand.`,
    )
  }
}

// Everything written for the section's component: one file, or a folder of variants.
const componentFiles = variants.length
  ? [
      [join(paths.component, 'index.tsx'), dispatcherTemplate(names, variants)],
      ...variants.map((variant) => [
        join(paths.component, `${variant.kebab}.tsx`),
        variantComponentTemplate(names, variant),
      ]),
    ]
  : [[paths.component, componentTemplate(names)]]

writeFileSync(paths.schema, schemaTemplate(names, variants))
if (variants.length) mkdirSync(paths.component)
for (const [file, content] of componentFiles) writeFileSync(file, content)
for (const [file, marker, text] of edits) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(marker, `${text}${marker}`))
}
if (existsSync(paths.placeholder) && !existsSync(paths.preview)) {
  copyFileSync(paths.placeholder, paths.preview)
  writeFileSync(
    paths.preview,
    readFileSync(paths.preview, 'utf8').replace('New section', escapeXml(title)),
  )
}

console.log(`\n✓ Created the "${title}" section (${typeName}):`)
for (const file of [paths.schema, ...componentFiles.map(([file]) => file), paths.preview])
  console.log(`  + ${rel(file)}`)
for (const file of [paths.registry, paths.fragments, paths.renderer, paths.fixtures])
  console.log(`  ~ ${rel(file)}`)

// Match the project's lint and formatting even when the pre-commit hook is off
// (e.g. imports added at the markers get sorted into place).
const touched = [
  paths.schema,
  paths.registry,
  paths.fragments,
  ...componentFiles.map(([file]) => file),
  paths.renderer,
  paths.fixtures,
]
const npx = (args) =>
  spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
npx(['eslint', '--fix', '--no-warn-ignored', ...touched])
npx(['prettier', '--write', '--log-level', 'warn', ...touched])

console.log('\nRegenerating types…')
const env = { ...process.env }
// Typegen reads the schema locally; it only needs *some* project config to load sanity.cli.ts.
if (!existsSync(join(root, '.env.local'))) {
  env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= 'placeholder'
  env.NEXT_PUBLIC_SANITY_DATASET ??= 'production'
}
const typegen = spawnSync('npm', ['run', 'typegen', '--silent'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (typegen.status !== 0) {
  console.error('\nTypegen failed. Fix the error above, then run `npm run typegen`.')
  process.exit(1)
}

console.log(`
Next:
  1. Add fields in ${rel(paths.schema)}
  2. Query them in ${typeName}Fragment (${rel(paths.fragments)}), then run \`npm run typegen\`
  3. Build the UI in ${variants.length ? `${rel(paths.component)}/ (one file per variant)` : rel(paths.component)}
  4. Optional: replace the thumbnail at ${rel(paths.preview)}
  5. Give the "${kebab}" entry in the section gallery real content (${rel(paths.fixtures)}), then
     add its screenshot baseline: \`npm run test:e2e:update\` on Linux or in Docker (see the
     README's "Section gallery"). Until then the visual test for "${kebab}" has no baseline and fails.

"${title}" is already in Studio's "Add section" menu.
`)

// ---------------------------------------------------------------------------

function escapeXml(text) {
  return text.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
}

function rel(file) {
  return relative(root, file)
}

function exit(message) {
  console.error(message)
  process.exit(1)
}
