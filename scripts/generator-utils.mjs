/**
 * Shared by the `new:feature`, `new:document` and `new:singleton` generators: names, marker
 * insertion and the lint/format/typegen pass. `new:section` predates this and keeps its own copy.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { toSectionNames } from './section-names.mjs'

/** "blogPost" -> "BLOG_POST", for query constant names. */
export function constantCase(typeName) {
  return typeName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
}

/** Feature folder names are the kebab form of whatever was typed; null when unusable. */
export function toFeatureName(input) {
  return toSectionNames(input)?.kebab ?? null
}

/** The export a feature's schema registry uses: "draft-mode" -> "draftModeSchemaTypes". */
export function registryExportName(feature) {
  return `${toSectionNames(feature).typeName}SchemaTypes`
}

/** A new `schemas/index.ts` for a feature that has none yet, with the generators' markers. */
export function registrySource(feature) {
  return `import type { SchemaTypeDefinition } from 'sanity'

// new-schema:import

export const ${registryExportName(feature)}: SchemaTypeDefinition[] = [
  // new-schema:register
]
`
}

/**
 * Inserts `text` on the lines just above the line holding `// <marker>`, indented to match it,
 * and keeps the marker so the next run finds it. Returns null when the marker is missing.
 */
export function insertAtMarker(source, marker, text) {
  const lines = source.split('\n')
  const at = lines.findIndex((line) => line.trim() === marker)
  if (at === -1) return null
  const indent = /^\s*/.exec(lines[at])[0]
  const inserted = text
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => (line ? indent + line : line))
  lines.splice(at, 0, ...inserted)
  return lines.join('\n')
}

/**
 * Applies `{ file, marker, text, unless? }` edits in order, per file. An edit whose file already
 * contains `unless` is skipped (an import that is already there). `read` is injectable for tests.
 * Returns `{ files: Map<file, newSource> }`, or `{ missing: [{ file, marker }] }` without
 * changing anything when a marker isn't found, so a failure never leaves a half-made result.
 */
export function applyEdits(edits, read = (file) => readFileSync(file, 'utf8')) {
  const files = new Map()
  const missing = []
  for (const { file, marker, text, unless } of edits) {
    const source = files.get(file) ?? read(file)
    if (unless && source.includes(unless)) {
      files.set(file, source)
      continue
    }
    const next = insertAtMarker(source, marker, text)
    if (next === null) missing.push({ file, marker })
    else files.set(file, next)
  }
  return missing.length ? { missing } : { files }
}

/** Project-level helpers bound to a repo root. */
export function createContext(root) {
  const rel = (file) => relative(root, file)

  function exit(message) {
    console.error(message)
    process.exit(1)
  }

  /**
   * Checks every marker, then writes the new files and the edited ones (edits see a new file's
   * content). Returns every path written, for `tidy`.
   */
  function write({ create, edits }) {
    const result = applyEdits(edits, (file) => create[file] ?? readFileSync(file, 'utf8'))
    if (result.missing) {
      const list = result.missing.map(({ file, marker }) => `  ${marker} in ${rel(file)}`)
      exit(
        `Couldn't find these marker comments. Restore them, or make the change by hand:\n${list.join('\n')}`,
      )
    }
    for (const [file, source] of Object.entries(create)) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, source)
    }
    for (const [file, source] of result.files) writeFileSync(file, source)
    return [...new Set([...Object.keys(create), ...result.files.keys()])]
  }

  /** Match the project's lint and formatting even when the pre-commit hook is off. */
  function tidy(files) {
    files = files.filter((file) => /\.(m?[jt]sx?|json)$/.test(file))
    const npx = (args) =>
      spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
    npx(['eslint', '--fix', '--no-warn-ignored', ...files])
    npx(['prettier', '--write', '--log-level', 'warn', ...files])
  }

  function typegen() {
    console.log('\nRegenerating types…')
    const env = { ...process.env }
    // Typegen reads the schema locally; it only needs *some* project config to load sanity.cli.ts.
    if (!existsSync(join(root, '.env.local'))) {
      env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= 'placeholder'
      env.NEXT_PUBLIC_SANITY_DATASET ??= 'production'
    }
    const result = spawnSync('npm', ['run', 'typegen', '--silent'], {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    if (result.status !== 0) {
      console.error('\nTypegen failed. Fix the error above, then run `npm run typegen`.')
      process.exit(1)
    }
  }

  /** Drops the empty-folder placeholders `new:feature` leaves, once a real file lives there. */
  const removeGitkeeps = (files) => files.forEach((file) => rmSync(file, { force: true }))

  return { rel, exit, write, tidy, typegen, removeGitkeeps }
}

/** Where a schema type called `typeName` is already defined (schema files under src), if anywhere. */
export function findTypeNameUsage(root, typeName) {
  const pattern = new RegExp(`\\bname:\\s*'${typeName}'`)
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return walk(path)
      return /\.tsx?$/.test(entry.name) &&
        /[\\/]schemas?[\\/]/.test(path) &&
        pattern.test(readFileSync(path, 'utf8'))
        ? [path]
        : []
    })
  return walk(join(root, 'src'))[0] ?? null
}

/**
 * Edits (and a file to create, if the feature has no registry yet) that put the schema type
 * `typeName` from `schemas/<kebab>.ts` into the feature's registry, and the registry into
 * sanity.config.ts when it isn't there. Returns `{ create, edits, registryFile }`, or `{ error }`.
 */
export function planSchemaRegistration({ root, feature, typeName, kebab }) {
  const registryFile = join(root, 'src/features', feature, 'schemas/index.ts')
  const config = join(root, 'sanity.config.ts')
  const create = {}
  let exportName = registryExportName(feature)
  if (existsSync(registryFile)) {
    const found = /export const (\w+)\b[^=]*=/.exec(readFileSync(registryFile, 'utf8'))
    if (!found)
      return { error: `Couldn't find the schema list in ${relative(root, registryFile)}.` }
    exportName = found[1]
  } else {
    create[registryFile] = registrySource(feature)
  }
  const edits = [
    {
      file: registryFile,
      marker: '// new-schema:import',
      text: `import { ${typeName} } from './${kebab}'\n`,
    },
    { file: registryFile, marker: '// new-schema:register', text: `${typeName},\n` },
  ]
  const importPath = `./src/features/${feature}/schemas'`
  if (!readFileSync(config, 'utf8').includes(importPath)) {
    edits.push(
      {
        file: config,
        marker: '// new-registry:import',
        text: `import { ${exportName} } from '${importPath}\n`,
      },
      { file: config, marker: '// new-registry:register', text: `...${exportName},\n` },
    )
  }
  return { create, edits, registryFile }
}
