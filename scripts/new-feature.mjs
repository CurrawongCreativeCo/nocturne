/**
 * Scaffolds a feature folder:
 *
 *   npm run new:feature events
 *
 * Creates src/features/<name>/{api,components,schemas,types} (each holds a .gitkeep until the
 * first real file arrives) and adds the name to the `features` list in eslint.config.mjs, so the
 * import rules keep it apart from other features. There are no barrel files: import files directly.
 * Add content types with `npm run new:document` and `npm run new:singleton`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createContext, toFeatureName } from './generator-utils.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { rel, exit, write, tidy } = createContext(root)

const input = process.argv.slice(2).join(' ').trim()
if (!input) exit('Usage: npm run new:feature <name>   e.g. npm run new:feature events')

const name = toFeatureName(input)
if (!name) exit(`"${input}" isn't a usable name. Start with a letter, e.g. "events".`)

const dir = join(root, 'src/features', name)
const eslintConfig = join(root, 'eslint.config.mjs')

if (existsSync(dir)) exit(`A feature called "${name}" already exists (${rel(dir)}).`)
if (new RegExp(`^\\s*'${name}',$`, 'm').test(readFileSync(eslintConfig, 'utf8'))) {
  exit(`"${name}" is already in the \`features\` list in ${rel(eslintConfig)}.`)
}

const folders = ['api', 'components', 'schemas', 'types']
const create = Object.fromEntries(folders.map((folder) => [join(dir, folder, '.gitkeep'), '']))

const touched = write({
  create,
  edits: [{ file: eslintConfig, marker: '// new-feature:register', text: `'${name}',\n` }],
})
tidy(touched)

console.log(`
✓ Created the "${name}" feature:
${folders.map((folder) => `  + ${rel(join(dir, folder))}/`).join('\n')}
  ~ ${rel(eslintConfig)}

Next:
  npm run new:document ${name} <name>    a document type with title and slug
  npm run new:singleton ${name} <name>   a document that exists once (like Site settings)
`)
