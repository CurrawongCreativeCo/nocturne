/**
 * Before the `locations` flag goes on for a site that already has content: lists the published
 * pages that `/locations/<slug>` would take over. Read-only, like `check:service-routes`: it reads
 * page slugs from the dataset and changes nothing, renames nothing and creates no redirect. Run with
 * `npm run check:location-routes`; it reads the environment, then .env.local, and needs
 * SANITY_API_READ_TOKEN on a private dataset. Exit code 1 when a page would be shadowed (README,
 * "Locations").
 *
 * The route `/locations/[slug]` answers every address of exactly two segments under `/locations`, so
 * a page at `locations/parramatta` stops being reachable. Deeper addresses (`locations/a/b`) and the
 * page `locations` itself are not affected: the page builder's catch-all still serves them.
 *
 * The service-area migration (`migrations/service-areas-to-locations`) makes pages at the same
 * addresses, so run this before it, too.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseEnv } from './check-dataset.mjs'
import { readPages } from './check-service-routes.mjs'

/**
 * Pure. `pages` are `{ _id, title, slug }` (published, without the `drafts.` ones); returns the
 * pages the locations route would shadow, each with what to do about it.
 */
export function findLocationRouteCollisions(pages) {
  return pages
    .filter(({ slug }) => /^locations\/[^/]+$/.test(slug))
    .map(({ _id, title, slug }) => ({
      _id,
      title,
      slug,
      path: `/${slug}`,
      action: `Rename the page's address (for example to "${slug.replace('locations/', 'where-we-work/')}") and add a redirect from /${slug}, or leave the locations flag off. Nothing is changed for you.`,
    }))
}

/** Pure: the report as text, and whether the site is clear to enable locations. */
export function describeCollisions(collisions) {
  if (collisions.length === 0) {
    return {
      ok: true,
      message:
        'No published page is at /locations/<slug>. The locations flag can be switched on without shadowing a page.',
    }
  }
  const lines = collisions.map(
    ({ path, title, _id }) => `  - ${path}  ("${title ?? 'Untitled'}", ${_id})`,
  )
  return {
    ok: false,
    message: [
      `${collisions.length} published page${collisions.length === 1 ? '' : 's'} would be shadowed by /locations/<slug> once the locations flag is on:`,
      ...lines,
      'Rename each page and redirect its old address (Studio: Pages, then Redirects) before enabling locations. This script changes nothing.',
    ].join('\n'),
  }
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
  const result = describeCollisions(findLocationRouteCollisions(pages))
  if (result.ok) console.log(`✓ ${result.message}`)
  else {
    console.error(`✗ ${result.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
