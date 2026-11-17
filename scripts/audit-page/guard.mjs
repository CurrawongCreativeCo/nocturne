/**
 * The audit's network boundary (README, "Page audit", "What it will and will not fetch"). Every
 * request the audit sends to a site goes through `createGuardedNet`, which enforces, in one place
 * and whatever the page says:
 *
 *  - only `http:` and `https:` URLs without credentials in them, and only `GET` and `HEAD`;
 *  - only the **permitted origin**: the one named on the command line (and the `https` version of an
 *    `http` address). Anything else, including a redirect, a link, a sitemap entry or a canonical that
 *    names another host, a private address or `localhost`, is refused without a request. The address
 *    you type is trusted, which is how a local server can be audited; nothing the page says widens it.
 *    `--expect-origin` is never added: it is only the domain canonicals are compared with;
 *  - redirects are followed by hand, a few hops, and never off the permitted origin: the hop that
 *    would leave is returned unfollowed;
 *  - a cap on requests, a deadline for the whole audit, a timeout per request (response bodies are
 *    capped in `net.mjs`), and `authorization` and `cookie` headers are never sent.
 *
 * It does not resolve DNS, so a host that resolves to a private address is not caught; the origin you
 * name is the one you chose to trust. Pure apart from the `request` it is given.
 */

/** Per-audit limits. Concurrency (6) is set where the work is fanned out, in run.mjs. */
export const LIMITS = Object.freeze({
  /** Requests to the site in one audit: pages, links, canonicals, robots.txt, sitemaps, llms.txt. */
  maxRequests: 600,
  maxRedirects: 5,
  /** The whole audit, in milliseconds. */
  deadlineMs: 180_000,
  /** One request, in milliseconds. */
  requestTimeoutMs: 15_000,
})

/** The audit may not go ahead as asked; the CLI prints the message and exits 2. */
export class AuditRefusal extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuditRefusal'
  }
}

/**
 * The origins an audit of `target` may talk to: its own, and for an `http` address on the default
 * port its `https` version (a site that upgrades). Throws `AuditRefusal` for anything else.
 */
export function permittedOrigins(target) {
  let url
  try {
    url = new URL(target)
  } catch {
    throw new AuditRefusal(`"${target}" is not a web address.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AuditRefusal(`"${target}" is not an http or https address.`)
  }
  if (url.username || url.password) {
    throw new AuditRefusal('Put no username or password in the address; the audit would send it.')
  }
  const origins = [url.origin]
  if (url.protocol === 'http:' && url.port === '') origins.push(`https://${url.host}`)
  return origins
}

const SAFE_METHODS = new Set(['GET', 'HEAD'])
const NEVER_SENT = new Set(['authorization', 'cookie', 'proxy-authorization'])

/**
 * `request(url, options)` is the real network function (launch-check's `request`, possibly with the
 * protection-bypass header added). Returns `{ request, followRedirects, pin, stats }`: `request`
 * (with `follow: true` it follows within the origin) and `followRedirects` never throw and answer
 * like launch-check's, with `{ status: 0, error, refused: true }` for a request that was not sent.
 */
export function createGuardedNet({ request, allowed, limits = LIMITS, now = Date.now }) {
  let origins = new Set(allowed)
  const started = now()
  const refused = []
  let sent = 0

  const refuse = (url, error) => {
    refused.push({ url: String(url), error })
    return {
      url: String(url),
      status: 0,
      headers: {},
      contentType: '',
      text: '',
      error,
      refused: true,
    }
  }

  async function single(url, options = {}) {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      return refuse(url, 'Refused: not a URL.')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return refuse(url, `Refused: ${parsed.protocol} is not http or https.`)
    }
    if (parsed.username || parsed.password) return refuse(url, 'Refused: credentials in the URL.')
    if (!origins.has(parsed.origin)) {
      return refuse(
        url,
        `Refused: ${parsed.origin} is outside the permitted ${[...origins].join(' or ')}.`,
      )
    }
    if (!SAFE_METHODS.has((options.method ?? 'GET').toUpperCase())) {
      return refuse(url, 'Refused: the audit only sends GET and HEAD.')
    }
    if (sent >= limits.maxRequests)
      return refuse(url, `Refused: over ${limits.maxRequests} requests.`)
    const remaining = limits.deadlineMs - (now() - started)
    if (remaining <= 0) return refuse(url, 'Refused: the audit ran out of time.')
    sent += 1
    const headers = Object.fromEntries(
      Object.entries(options.headers ?? {}).filter(([name]) => !NEVER_SENT.has(name.toLowerCase())),
    )
    const { follow: _follow, body: _body, ...rest } = options
    return request(url, {
      ...rest,
      headers,
      follow: false,
      timeout: Math.min(
        options.timeout ?? limits.requestTimeoutMs,
        limits.requestTimeoutMs,
        remaining,
      ),
    })
  }

  /**
   * Like launch-check's `followRedirects`, but a hop to another origin is not requested: the chain
   * ends at the redirect and `leftOrigin` is where it pointed.
   */
  async function followRedirects(url, { max = limits.maxRedirects, ...options } = {}) {
    const chain = []
    let current = url
    let response
    let leftOrigin
    for (let hop = 0; hop <= max; hop += 1) {
      response = await single(current, options)
      const location = response.headers?.location
      chain.push({ url: current, status: response.status, location })
      if (response.error || response.status < 300 || response.status >= 400 || !location) break
      let next
      try {
        next = new URL(location, current)
      } catch {
        break
      }
      if (!origins.has(next.origin) || next.username || next.password) {
        leftOrigin = next.href
        refused.push({ url: next.href, error: `Not followed: a redirect from ${current}.` })
        break
      }
      current = next.href
    }
    return {
      chain,
      final: { ...response, url: chain.at(-1).url },
      ...(leftOrigin && { leftOrigin }),
    }
  }

  return {
    request: async (url, options = {}) =>
      options.follow ? (await followRedirects(url, options)).final : single(url, options),
    followRedirects,
    /** After the first page answers, narrows the permitted origins to the one it ended on. */
    pin(origin) {
      origins = new Set([origin])
    },
    stats: () => ({ sent, permitted: [...origins], refused: [...refused] }),
  }
}
