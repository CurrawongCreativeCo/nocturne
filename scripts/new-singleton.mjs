/**
 * Scaffolds a singleton document (one that exists once, like Site settings) inside a feature:
 *
 *   npm run new:singleton site footer-banner
 *
 * Creates the schema, registers the type in the feature's schema list (and that list in
 * sanity.config.ts if needed) and in SINGLETON_TYPES, which stops editors creating, duplicating or
 * deleting it, and pins it in the desk structure at the fixed document id `<typeName>`. Then runs typegen.
 * Read it with `*[_id == "<typeName>"][0]`.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createContext,
  findTypeNameUsage,
  planSchemaRegistration,
  toFeatureName,
} from './generator-utils.mjs'
import { toSectionNames } from './section-names.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { rel, exit, write, tidy, typegen, removeGitkeeps } = createContext(root)

const [featureInput, ...nameInput] = process.argv.slice(2)
const usage =
  'Usage: npm run new:singleton <feature> <name>   e.g. npm run new:singleton site footer-banner'
if (!featureInput || !nameInput.length) exit(usage)

const feature = toFeatureName(featureInput)
if (!feature) exit(`"${featureInput}" isn't a usable feature name.\n${usage}`)
const names = toSectionNames(nameInput.join(' '))
if (!names)
  exit(`"${nameInput.join(' ')}" isn't a usable name. Start with a letter, e.g. "footer-banner".`)
const { kebab, typeName, title } = names

if (!existsSync(join(root, 'src/features', feature)))
  exit(`There is no "${feature}" feature. Create it first: npm run new:feature ${feature}`)

const paths = {
  schema: join(root, 'src/features', feature, 'schemas', `${kebab}.ts`),
  singletons: join(root, 'src/features/studio/singletons.ts'),
  structure: join(root, 'src/features/studio/structure.ts'),
  gitkeep: join(root, 'src/features', feature, 'schemas/.gitkeep'),
}

if (existsSync(paths.schema)) exit(`"${kebab}" already exists in the ${feature} feature.`)
const existing = findTypeNameUsage(root, typeName)
if (existing) exit(`A schema type called "${typeName}" already exists (${rel(existing)}).`)

const registration = planSchemaRegistration({ root, feature, typeName, kebab })
if (registration.error) exit(registration.error)

const touched = write({
  create: { ...registration.create, [paths.schema]: schema() },
  edits: [
    ...registration.edits,
    { file: paths.singletons, marker: '// new-singleton:register', text: `'${typeName}',\n` },
    {
      file: paths.structure,
      marker: '// new-singleton:import',
      text: "import { DocumentIcon } from '@sanity/icons/Document'\n",
      unless: "'@sanity/icons/Document'",
    },
    {
      file: paths.structure,
      marker: '// new-singleton:list',
      text: `S.listItem()
  .title('${escapeJs(title)}')
  .id('${typeName}')
  .icon(DocumentIcon)
  .child(S.document().schemaType('${typeName}').documentId('${typeName}').title('${escapeJs(title)}')),
`,
    },
  ],
})
removeGitkeeps([paths.gitkeep])

console.log(
  `\n✓ Created the "${title}" singleton (${typeName}, document id "${typeName}") in ${feature}:`,
)
console.log(`  + ${rel(paths.schema)}`)
for (const file of touched.filter((f) => f !== paths.schema))
  console.log(`  ${registration.create[file] ? '+' : '~'} ${rel(file)}`)

tidy(touched)
typegen()

console.log(`
Next:
  1. Add fields in ${rel(paths.schema)}
  2. Read it with a query in the feature's api folder: \`*[_id == "${typeName}"][0] { … }\`, fetched
     through cachedSanityFetch with \`tags: [TAGS.${typeName}]\` (add ${typeName} to TAGS in
     src/lib/sanity/live.ts and to the webhook filter in the README), then run \`npm run typegen\`
`)

// ---------------------------------------------------------------------------

function schema() {
  return `import { DocumentIcon } from '@sanity/icons/Document'
import { defineField, defineType } from 'sanity'

/** A singleton: the one document has \`_id === '${typeName}'\` (see SINGLETON_TYPES and the desk structure). */
export const ${typeName} = defineType({
  name: '${typeName}',
  title: '${escapeJs(title)}',
  type: 'document',
  icon: DocumentIcon,
  fields: [defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() })],
  preview: {
    prepare: () => ({ title: '${escapeJs(title)}' }),
  },
})
`
}

function escapeJs(text) {
  return text.replace(/['\\]/g, '\\$&')
}
