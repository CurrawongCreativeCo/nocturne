/** Command-line handling shared by launch:check and launch:screens. Pure. */

/** "example.com" and "https://example.com/" both become "https://example.com". Throws on junk. */
export function normaliseSiteUrl(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('Pass the site URL, e.g. npm run launch:check -- https://example.com')
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`"${text}" isn't a web address (use https://…).`)
  }
  return url.origin
}

/** A path on the site: "/about". Anything else is a typo, not a page. */
function privatePath(value, flag) {
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || /\s/.test(path)) {
    throw new Error(`${flag} needs paths that start with "/", not "${value}".`)
  }
  return path
}

/**
 * `<url> [--json] [--max-urls=N] [--prelaunch] [--bypass] [--expect-origin=URL]
 * [--expect-private=/a,/b] [--expect-public=/c] [--help]`. The path flags can be repeated.
 */
export function parseArgs(argv) {
  const options = {
    url: undefined,
    json: false,
    help: false,
    maxUrls: undefined,
    prelaunch: false,
    bypass: false,
    expectOrigin: undefined,
    expectPrivate: [],
    expectPublic: [],
  }
  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg === '--prelaunch') options.prelaunch = true
    else if (arg === '--bypass') options.bypass = true
    else if (arg.startsWith('--expect-origin=')) {
      options.expectOrigin = normaliseSiteUrl(arg.slice('--expect-origin='.length))
    } else if (arg.startsWith('--expect-private=')) {
      const paths = arg
        .slice('--expect-private='.length)
        .split(',')
        .filter((part) => part.trim() !== '')
      if (paths.length === 0)
        throw new Error('--expect-private needs at least one path, like /about.')
      options.expectPrivate.push(...paths.map((path) => privatePath(path, '--expect-private')))
    } else if (arg.startsWith('--expect-public=')) {
      const paths = arg
        .slice('--expect-public='.length)
        .split(',')
        .filter((part) => part.trim() !== '')
      if (paths.length === 0)
        throw new Error('--expect-public needs at least one path, like /privacy.')
      options.expectPublic.push(...paths.map((path) => privatePath(path, '--expect-public')))
    } else if (arg === '--help' || arg === '-h') options.help = true
    else if (arg.startsWith('--max-urls=')) {
      const value = Number(arg.slice('--max-urls='.length))
      if (!Number.isInteger(value) || value < 1) throw new Error('--max-urls needs a whole number.')
      options.maxUrls = value
    } else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`)
    else if (options.url === undefined) options.url = arg
    else throw new Error(`Unexpected extra argument "${arg}".`)
  }
  return options
}
