/**
 * Scaffolds a document type inside a feature:
 *
 *   npm run new:document blog case-study
 *
 * Creates the schema (title and slug) and an API file with a GROQ query and a cached fetcher,
 * registers the type in the feature's schema list (and that list in sanity.config.ts if needed),
 * adds a cache tag and a desk structure entry at the `// new-document:*` markers, then runs typegen.
 * The feature must exist: create one with `npm run new:feature`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  constantCase,
  createContext,
  classifyNewDocument,
  findTypeNameUsage,
  planSchemaRegistration,
  toFeatureName,
} from './generator-utils.mjs'
import { toSectionNames } from './section-names.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { rel, exit, write, tidy, typegen, removeGitkeeps } = createContext(root)

const [featureInput, ...nameInput] = process.argv.slice(2)
const usage =
  'Usage: npm run new:document <feature> <name>   e.g. npm run new:document blog case-study'
if (!featureInput || !nameInput.length) exit(usage)

const feature = toFeatureName(featureInput)
if (!feature) exit(`"${featureInput}" isn't a usable feature name.\n${usage}`)
const names = toSectionNames(nameInput.join(' '))
if (!names)
  exit(`"${nameInput.join(' ')}" isn't a usable name. Start with a letter, e.g. "case-study".`)
const { kebab, typeName, Component, title } = names

if (!existsSync(join(root, 'src/features', feature)))
  exit(`There is no "${feature}" feature. Create it first: npm run new:feature ${feature}`)

const paths = {
  schema: join(root, 'src/features', feature, 'schemas', `${kebab}.ts`),
  api: join(root, 'src/features', feature, 'api', `${kebab}.ts`),
  live: join(root, 'src/lib/sanity/live.ts'),
  structure: join(root, 'src/features/studio/structure.ts'),
  clientEditable: join(root, 'src/lib/sanity/client-editable.ts'),
  exposure: join(root, 'scripts/dataset-exposure.json'),
  gitkeeps: ['schemas', 'api'].map((dir) => join(root, 'src/features', feature, dir, '.gitkeep')),
}

if (existsSync(paths.schema) || existsSync(paths.api))
  exit(`"${kebab}" already exists in the ${feature} feature.`)
const existing = findTypeNameUsage(root, typeName)
if (existing) exit(`A schema type called "${typeName}" already exists (${rel(existing)}).`)
if (new RegExp(`^\\s*${typeName}:`, 'm').test(readFileSync(paths.live, 'utf8')))
  exit(`"${typeName}" is already in TAGS (${rel(paths.live)}).`)

const registration = planSchemaRegistration({ root, feature, typeName, kebab })
if (registration.error) exit(registration.error)

const touched = write({
  create: {
    ...registration.create,
    [paths.schema]: schema(),
    [paths.api]: api(),
    // A public dataset exposes this type too: record the decision (see src/app/dataset-exposure.test.ts).
    [paths.exposure]: classifyNewDocument(readFileSync(paths.exposure, 'utf8'), typeName),
  },
  edits: [
    ...registration.edits,
    { file: paths.live, marker: '// new-document:tag', text: `${typeName}: '${typeName}',\n` },
    { file: paths.clientEditable, marker: '// new-type:agency-only', text: `'${typeName}',\n` },
    { file: paths.structure, marker: '// new-document:listed', text: `'${typeName}',\n` },
    {
      file: paths.structure,
      marker: '// new-document:list',
      text: `S.documentTypeListItem('${typeName}').title('${escapeJs(title)}'),\n`,
    },
  ],
})
removeGitkeeps(paths.gitkeeps)

console.log(`\n✓ Created the "${title}" document type (${typeName}) in ${feature}:`)
for (const file of [paths.schema, paths.api]) console.log(`  + ${rel(file)}`)
for (const file of touched.filter((f) => ![paths.schema, paths.api].includes(f)))
  console.log(`  ${registration.create[file] ? '+' : '~'} ${rel(file)}`)

tidy(touched)
typegen()

console.log(`
Next:
  1. Add fields in ${rel(paths.schema)}
  2. Shape ${constantCase(typeName)}_QUERY and get${Component}() in ${rel(paths.api)}, then run \`npm run typegen\`
  3. Check scripts/dataset-exposure.json: "${typeName}" is recorded as published. If it can hold
     personal or secret data, add a probe there and mark it probed (README, "Dataset privacy")
  4. Webhook mode only: add "${typeName}" to the webhook filter (README, "Live mode vs. webhook mode")
  5. Routes in src/app compose the feature: call get${Component}() from a page. If you add a route,
     add a fixture document in tests/e2e/fixtures/dataset.mjs so the axe scan covers it.
`)

// ---------------------------------------------------------------------------

function schema() {
  return `import { DocumentIcon } from '@sanity/icons/Document'
import { defineField, defineType } from 'sanity'

export const ${typeName} = defineType({
  name: '${typeName}',
  title: '${escapeJs(title)}',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare: ({ title, slug }: { title?: string; slug?: string }) => ({
      title: title || 'Untitled',
      subtitle: slug,
    }),
  },
})
`
}

function api() {
  return `import { defineQuery } from 'next-sanity'

import { cachedSanityFetch, TAGS, type FetchMode } from '@/lib/sanity/live'

/** One ${title.toLowerCase()} by slug. Add fields (and the fragments in lib/sanity/fragments.ts) as the page needs them. */
export const ${constantCase(typeName)}_QUERY = defineQuery(/* groq */ \`
  *[_type == "${typeName}" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current
  }
\`)

/**
 * Callers pass \`PUBLISHED\` or, in draft mode, \`getDraftFetchMode()\` from inside <Suspense>, and
 * always the same argument shape, so they share one cache entry. List every document type the
 * result depends on in \`tags\`, including resolved references.
 */
export async function get${Component}(slug: string, mode: FetchMode) {
  const { data } = await cachedSanityFetch({
    query: ${constantCase(typeName)}_QUERY,
    params: { slug },
    ...mode,
    tags: [TAGS.${typeName}],
  })
  return data
}
`
}

function escapeJs(text) {
  return text.replace(/['\\]/g, '\\$&')
}
