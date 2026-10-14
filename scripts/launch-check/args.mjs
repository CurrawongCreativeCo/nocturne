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

/** `<url> [--json] [--max-urls=N] [--help]`. */
export function parseArgs(argv) {
  const options = { url: undefined, json: false, help: false, maxUrls: undefined }
  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg === '--help' || arg === '-h') options.help = true
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
