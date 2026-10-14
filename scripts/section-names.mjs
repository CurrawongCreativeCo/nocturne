/**
 * Names for a new section, from whatever the user typed: "Pricing table", "pricingTable" and
 * "pricing-table" all give the same result. Returns null for input that can't make a name.
 */
export function toSectionNames(input) {
  const words = String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (!words.length || !/^[a-z]/.test(words[0] ?? '')) return null

  return {
    kebab: words.join('-'),
    typeName: words[0] + words.slice(1).map(capitalize).join(''),
    Component: words.map(capitalize).join(''),
    title: capitalize(words.join(' ')),
  }
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Most variants one section may have. More means two sections, or a bespoke layout in the client repo. */
export const MAX_VARIANTS = 4

/** Names a variant's file can't take: the folder's own dispatcher. */
const RESERVED_VARIANTS = ['index']

/**
 * Reads `npm run new:section <name> [-- --variants a,b,c]`. Returns `{ input, variants }` (variants is
 * empty without the flag, otherwise the names for each, the first being the default) or `{ error }`.
 */
export function parseSectionArgs(argv) {
  const words = []
  let list
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--variants') {
      list = argv[++i]
      if (list === undefined || list.startsWith('--'))
        return { error: '--variants needs a list: --variants a,b,c' }
    } else if (arg.startsWith('--variants=')) {
      list = arg.slice('--variants='.length)
    } else if (arg.startsWith('--')) {
      return {
        error: `Unknown option ${arg}. Usage: npm run new:section <name> [-- --variants a,b,c]`,
      }
    } else {
      words.push(arg)
    }
  }
  const input = words.join(' ').trim()
  if (list === undefined) return { input, variants: [] }

  const variants = []
  for (const item of list.split(',')) {
    const names = toSectionNames(item)
    if (!names || RESERVED_VARIANTS.includes(names.kebab)) {
      return {
        error: `"${item.trim()}" isn't a usable variant name. Start with a letter, e.g. "split".`,
      }
    }
    if (variants.some((variant) => variant.kebab === names.kebab)) {
      return { error: `The variant "${names.kebab}" is listed twice.` }
    }
    variants.push(names)
  }
  if (variants.length < 2)
    return { error: 'Give at least two variants, e.g. --variants default,split.' }
  if (variants.length > MAX_VARIANTS) {
    return {
      error: `A section has at most ${MAX_VARIANTS} variants (got ${variants.length}). Split it into two sections, or keep a one-off layout in the client repo.`,
    }
  }
  return { input, variants }
}
