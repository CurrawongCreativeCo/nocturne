/** Command-line handling for audit:page. Pure. */
import { normaliseSiteUrl } from '../launch-check/args.mjs'

/** The most sitemap pages `--sample` will fetch and audit; each one costs a page and its links. */
export const MAX_SAMPLE = 25

/** `<url> [--json] [--sample=N] [--confirm] [--expect-origin=URL] [--bypass] [--help]`. */
export function parseArgs(argv) {
  const options = {
    url: undefined,
    json: false,
    help: false,
    bypass: false,
    sample: 0,
    confirm: false,
    expectOrigin: undefined,
  }
  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg === '--bypass') options.bypass = true
    else if (arg === '--confirm') options.confirm = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else if (arg.startsWith('--expect-origin=')) {
      options.expectOrigin = normaliseSiteUrl(arg.slice('--expect-origin='.length))
    } else if (arg.startsWith('--sample=')) {
      const value = Number(arg.slice('--sample='.length))
      if (!Number.isInteger(value) || value < 0 || value > MAX_SAMPLE) {
        throw new Error(`--sample needs a whole number from 0 to ${MAX_SAMPLE}.`)
      }
      options.sample = value
    } else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`)
    else if (options.url === undefined) options.url = arg
    else throw new Error(`Unexpected extra argument "${arg}".`)
  }
  return options
}

/**
 * The address to audit: a full page URL as given, or a bare domain's home page. Throws on junk.
 * `example.com` and `https://example.com` are the home page; `https://example.com/about?x=1#top` is
 * `/about?x=1`.
 */
export function pageTarget(input) {
  const origin = normaliseSiteUrl(input)
  const text = String(input).trim()
  const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
  if (parsed.username || parsed.password) {
    throw new Error('Put no username or password in the address; the audit would not send it.')
  }
  return new URL(`${parsed.pathname}${parsed.search}`, origin).href
}
