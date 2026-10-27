type Env = Record<string, string | undefined>

/**
 * The Edge Config redirect sync's settings (README, "Edge Config redirects"), read from the
 * environment it is given so `config:check` and the setup status ask what the site asks. Pure, and
 * it returns an identifier or a yes/no, never the connection string's token.
 */

/** Edge Config store ids look like `ecfg_` and letters or digits. */
const STORE_ID = /^ecfg_[A-Za-z0-9]+$/

/**
 * Hosts Vercel documents for a connection string: `edge-config.vercel.com` and, since Vercel renamed
 * the product to Global Config, `global-config.vercel.com`. Anything else is not trusted to hold an id.
 */
const CONNECTION_HOSTS = ['edge-config.vercel.com', 'global-config.vercel.com']

/**
 * The store id in a connection string (`https://<host>/ecfg_…?token=…`), or undefined when the host
 * isn't one Vercel documents or the first path segment isn't an `ecfg_` id. Never returns the token,
 * and the parse error of a malformed string (which could echo it) is swallowed.
 */
function idInConnection(connection: string | undefined): string | undefined {
  if (!connection) return undefined
  try {
    const url = new URL(connection)
    if (url.protocol !== 'https:' || !CONNECTION_HOSTS.includes(url.hostname)) return undefined
    const segment = url.pathname.split('/')[1] ?? ''
    return STORE_ID.test(segment) ? segment : undefined
  } catch {
    return undefined
  }
}

/**
 * What is wrong with the store settings, in words, for `config:check`. Names only, never a value.
 * An explicit `EDGE_CONFIG_ID` that names a different store than `EDGE_CONFIG` is a problem: the
 * proxy would read one store while a publish wrote to another.
 */
export function edgeConfigProblems(env: Env): string[] {
  const problems: string[] = []
  const explicit = env.EDGE_CONFIG_ID
  const derived = idInConnection(env.EDGE_CONFIG)
  if (explicit && !STORE_ID.test(explicit)) {
    problems.push('EDGE_CONFIG_ID is not a store id (it starts ecfg_)')
  }
  if (env.EDGE_CONFIG && !derived && !explicit) {
    problems.push("EDGE_CONFIG_ID (the connection string doesn't show the store's id)")
  }
  if (explicit && derived && STORE_ID.test(explicit) && explicit !== derived) {
    problems.push('EDGE_CONFIG_ID names a different store than EDGE_CONFIG: remove one of them')
  }
  return problems
}

/**
 * The store id to write to: a valid `EDGE_CONFIG_ID`, else the id in `EDGE_CONFIG`. Undefined when
 * neither gives one, when `EDGE_CONFIG_ID` isn't a store id, or when the two name different stores
 * (nothing is written to a store that may not be the one being read).
 */
export function edgeConfigIdFrom(env: Env): string | undefined {
  if (edgeConfigProblems(env).some((problem) => problem.startsWith('EDGE_CONFIG_ID names'))) {
    return undefined
  }
  const explicit = env.EDGE_CONFIG_ID
  if (explicit) return STORE_ID.test(explicit) ? explicit : undefined
  return idInConnection(env.EDGE_CONFIG)
}

/** Whether a publish can rewrite the Edge Config redirects map. */
export function canSyncRedirectsFrom(env: Env): boolean {
  return Boolean(edgeConfigIdFrom(env) && env.VERCEL_API_TOKEN)
}

/**
 * Instant redirects need the proxy to read the map (`EDGE_CONFIG`) and something to write it
 * (a token, and a store id the connection string doesn't always give). Names only.
 */
export function getRedirectsReadiness(env: Env) {
  const missing: string[] = []
  if (!env.EDGE_CONFIG) missing.push('EDGE_CONFIG')
  if (!env.VERCEL_API_TOKEN) missing.push('VERCEL_API_TOKEN')
  missing.push(...edgeConfigProblems(env))
  return missing.length > 0 ? { ready: false as const, missing } : { ready: true as const }
}
