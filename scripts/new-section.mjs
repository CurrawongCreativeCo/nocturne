/**
 * Scaffolds a page-builder section end to end:
 *
 *   npm run new:section pricing-table
 *
 * Creates the schema, GROQ fragment, React component and insert-menu thumbnail,
 * registers each one at the `// new-section:*` markers, adds a placeholder to the section gallery's
 * fixture page, then runs typegen.
 * The new section starts with a title and text field; edit the four files to shape it.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toSectionNames } from './section-names.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const feature = join(root, 'src/features/pages')

const input = process.argv.slice(2).join(' ').trim()
if (!input) exit('Usage: npm run new:section <name>   e.g. npm run new:section pricing-table')

const names = toSectionNames(input)
if (!names) exit(`"${input}" isn't a usable name. Start with a letter, e.g. "pricing-table".`)
const { kebab, typeName, Component, title } = names

const paths = {
  schema: join(feature, 'schemas/sections', `${kebab}.ts`),
  registry: join(feature, 'schemas/sections/index.ts'),
  fragments: join(feature, 'api/sections.ts'),
  component: join(feature, 'components/sections', `${kebab}.tsx`),
  renderer: join(feature, 'components/section-renderer.tsx'),
  preview: join(root, 'public/section-previews', `${typeName}.svg`),
  placeholder: join(root, 'public/section-previews/_placeholder.svg'),
  fixtures: join(root, 'tests/e2e/fixtures/dataset.mjs'),
}

if (existsSync(paths.schema) || existsSync(paths.component))
  exit(`A section called "${kebab}" already exists.`)
if (readFileSync(paths.registry, 'utf8').match(new RegExp(`\\b${typeName}\\b`))) {
  exit(`"${typeName}" is already registered in ${rel(paths.registry)}.`)
}

// Check every insertion point before writing anything, so a failure leaves no half-made section.
const PAGE_BUILDER_TAIL = '  _type\n`\n'
const edits = [
  [paths.registry, '// new-section:import', `import { ${typeName} } from './${kebab}'\n`],
  [paths.registry, '  // new-section:register', `  ${typeName},\n`],
  [paths.fragments, '// new-section:fragment', fragment()],
  [paths.fragments, PAGE_BUILDER_TAIL, `  \${${typeName}Fragment},\n`],
  [paths.renderer, '// new-section:import', `import { ${Component} } from './sections/${kebab}'\n`],
  [paths.renderer, '  // new-section:register', `  ${typeName}: ${Component},\n`],
  [paths.fixtures, '  // new-section:gallery', galleryFixture()],
]
for (const [file, marker] of edits) {
  if (!readFileSync(file, 'utf8').includes(marker)) {
    exit(
      `Couldn't find the "${marker.trim()}" marker in ${rel(file)}. Restore it, or add the section by hand.`,
    )
  }
}

writeFileSync(paths.schema, schema())
writeFileSync(paths.component, component())
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
for (const file of [paths.schema, paths.component, paths.preview]) console.log(`  + ${rel(file)}`)
for (const file of [paths.registry, paths.fragments, paths.renderer, paths.fixtures])
  console.log(`  ~ ${rel(file)}`)

// Match the project's lint and formatting even when the pre-commit hook is off
// (e.g. imports added at the markers get sorted into place).
const touched = [
  paths.schema,
  paths.registry,
  paths.fragments,
  paths.component,
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
  3. Build the UI in ${rel(paths.component)}
  4. Optional: replace the thumbnail at ${rel(paths.preview)}
  5. Give the "${kebab}" entry in the section gallery real content (${rel(paths.fixtures)}), then
     add its screenshot baseline: \`npm run test:e2e:update\` on Linux or in Docker (see the
     README's "Section gallery"). Until then the visual test for "${kebab}" has no baseline and fails.

"${title}" is already in Studio's "Add section" menu.
`)

// ---------------------------------------------------------------------------

function schema() {
  return `import { BlockElementIcon } from '@sanity/icons/BlockElement'
import { defineField, defineType } from 'sanity'

import { accessField } from '@/lib/sanity/schema/access-field'

export const ${typeName} = defineType({
  name: '${typeName}',
  title: '${title}',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'text', type: 'text', rows: 3 }),
    accessField,
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }: { title?: string }) => ({ title: title || 'Untitled', subtitle: '${title}' }),
  },
})
`
}

function fragment() {
  return `export const ${typeName}Fragment = /* groq */ \`
  _type == "${typeName}" && (access != "members" || $members) => {
    title,
    text
  }
\`

`
}

function galleryFixture() {
  return `  // Placeholder from \`npm run new:section\`: fill it in, add a variant per look, then refresh baselines.
  {
    _key: '${kebab}',
    _type: '${typeName}',
    title: '${escapeJs(title)}',
    text: 'Text.',
  },
`
}

function component() {
  return `import type { SectionProps } from '../../types'

export function ${Component}({ data }: SectionProps<'${typeName}'>) {
  const { title, text } = data

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 max-w-2xl text-lg text-pretty text-gray-600">{text}</p>}
    </section>
  )
}
`
}

function escapeJs(text) {
  return text.replace(/['\\]/g, '\\$&')
}

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
