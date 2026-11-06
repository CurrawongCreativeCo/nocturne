import { SHARED_BUILDERS, type CapabilityId, type SharedBuilder } from './capabilities'

/**
 * Proof that a shared design builder made a field (task 275). The builders stamp the options they
 * create under a symbol no other module can name, so provenance can't be written as data: a hand-typed
 * `designBuilder` in a field's options proves nothing. The stamp also records the field it was made
 * for, so reusing a built field's options on another field is caught. Which modules may stamp is checked
 * from the source (`provenanceSourceProblems`, run on the repository by builder-provenance.test.ts).
 */

const PROVENANCE = Symbol('design builder provenance')

export interface Provenance {
  builder: SharedBuilder
  /** The capability the builder made it as, if it is one. */
  capability?: CapabilityId
  /** The field or type it was made for: absent for an option fragment (Adjust picture). */
  name?: string
}

/**
 * Options stamped as made by a shared builder. Only lib/sanity/schema/capability-marker.ts calls this;
 * builders call its `builtBy` and `builtOptions`, each only from its own module.
 */
export function stampProvenance<T extends object>(options: T, provenance: Provenance): T {
  return { ...options, [PROVENANCE]: provenance }
}

/** The stamp on some options, if a shared builder made them. */
export function provenanceOf(options: unknown): Provenance | undefined {
  if (options === null || typeof options !== 'object') return undefined
  const stamp = (options as Record<symbol, unknown>)[PROVENANCE]
  return stamp && typeof stamp === 'object' ? (stamp as Provenance) : undefined
}

/** A source file, by its path from the repository root. */
export interface SourceFile {
  path: string
  source: string
}

const MARKER_MODULE = 'src/lib/sanity/schema/capability-marker.ts'
const THIS_MODULE = 'src/lib/design/builder-provenance.ts'
const isTest = (path: string) => /\.test\.(ts|tsx|mjs)$/.test(path)

/**
 * Where provenance could be forged in the source: stamping outside the marker module, a builder name
 * used outside the module the registry gives it (SHARED_BUILDERS), or reading symbols off objects (the
 * way to copy a stamp). Tests may build fixtures with the helpers.
 */
export function provenanceSourceProblems(files: readonly SourceFile[]): string[] {
  const problems: string[] = []
  for (const { path, source } of files) {
    if (isTest(path) || path === THIS_MODULE) continue
    if (path !== MARKER_MODULE && /\bstampProvenance\b/.test(source)) {
      problems.push(`${path} stamps builder provenance; only ${MARKER_MODULE} may.`)
    }
    if (/\b(getOwnPropertySymbols|ownKeys|getOwnPropertyDescriptors)\b/.test(source)) {
      problems.push(`${path} reads object symbols, which could copy a builder's provenance stamp.`)
    }
    if (/\b(builtBy|builtOptions)\(\s*(?!['"])/.test(source) && path !== MARKER_MODULE) {
      problems.push(`${path} names a builder that isn't written out, so it can't be checked.`)
    }
    for (const match of source.matchAll(/\b(builtBy|builtOptions)\(\s*['"]([A-Za-z]+)['"]/g)) {
      const builder = match[2] as SharedBuilder
      const home: string | undefined = SHARED_BUILDERS[builder]
      if (home !== path) {
        problems.push(
          home
            ? `${path} claims the ${builder} builder, which only ${home} may.`
            : `${path} claims "${builder}", which isn't a shared builder.`,
        )
      }
    }
    if (
      path !== MARKER_MODULE &&
      /\b(builtBy|builtOptions)\(/.test(source) &&
      !(Object.values(SHARED_BUILDERS) as string[]).includes(path)
    ) {
      problems.push(`${path} calls a builder stamp but isn't a shared builder's module.`)
    }
  }
  return problems
}
