/**
 * Before the `services` flag goes on for a site that already has content: lists the published pages
 * that `/services/<slug>` would take over. Read-only: it reads page slugs from the dataset and
 * changes nothing, renames nothing and creates no redirect. Run with `npm run check:service-routes`;
 * it reads the environment, then .env.local, like `check:dataset`, and needs SANITY_API_READ_TOKEN
 * on a private dataset. Exit code 1 when a page would be shadowed (README, "Services").
 *
 * The route `/services/[slug]` answers every address of exactly two segments under `/services`, so
 * a page at `services/web-design` stops being reachable (it would answer 404 unless a service has
 * that slug). Deeper addresses (`services/web/design`) and the page `services` itself are not
 * affected: the page builder's catch-all still serves them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseEnv } from './check-dataset.mjs'

const API_VERSION = 'v2021-06-07'
const PAGES_QUERY =
  '*[_type == "page" && defined(slug.current)]{ _id, title, "slug": slug.current }'

/**
 * Pure. `pages` are `{ _id, title, slug }` (published, without the `drafts.` ones); returns the
 * pages the services route would shadow, each with what to do about it.
 */
export function findServiceRouteCollisions(pages) {
  return pages
    .filter(({ slug }) => /^services\/[^/]+$/.test(slug))
    .map(({ _id, title, slug }) => ({
      _id,
      title,
      slug,
      path: `/${slug}`,
      action: `Rename the page's address (for example to "${slug.replace('services/', 'our-services/')}") and add a redirect from /${slug}, or leave the services flag off. Nothing is changed for you.`,
    }))
}

/** Pure: the report as text, and whether the site is clear to enable services. */
export function describeCollisions(collisions) {
  if (collisions.length === 0) {
    return {
      ok: true,
      message:
        'No published page is at /services/<slug>. The services flag can be switched on without shadowing a page.',
    }
  }
  const lines = collisions.map(
    ({ path, title, _id }) => `  - ${path}  ("${title ?? 'Untitled'}", ${_id})`,
  )
  return {
    ok: false,
    message: [
      `${collisions.length} published page${collisions.length === 1 ? '' : 's'} would be shadowed by /services/<slug> once the services flag is on:`,
      ...lines,
      'Rename each page and redirect its old address (Studio: Pages, then Redirects) before enabling services. This script changes nothing.',
    ].join('\n'),
  }
}

export async function readPages({ projectId, dataset, token, fetchImpl = fetch }) {
  const url = new URL(`https://${projectId}.api.sanity.io/${API_VERSION}/data/query/${dataset}`)
  url.searchParams.set('query', PAGES_QUERY)
  url.searchParams.set('perspective', 'published')
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`The Sanity API answered HTTP ${response.status}.`)
  const body = await response.json()
  return Array.isArray(body?.result) ? body.result : []
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const envPath = join(root, '.env.local')
  const file = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {}
  const read = (key) => process.env[key] || file[key]
  const projectId = read('NEXT_PUBLIC_SANITY_PROJECT_ID')
  const dataset = read('NEXT_PUBLIC_SANITY_DATASET') || 'production'
  if (!projectId) {
    console.error('✗ NEXT_PUBLIC_SANITY_PROJECT_ID is not set (environment or .env.local).')
    process.exit(1)
  }
  let pages
  try {
    pages = await readPages({ projectId, dataset, token: read('SANITY_API_READ_TOKEN') })
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
  const result = describeCollisions(findServiceRouteCollisions(pages))
  if (result.ok) console.log(`✓ ${result.message}`)
  else {
    console.error(`✗ ${result.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
