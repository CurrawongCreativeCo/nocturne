import { readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Every page and route handler under src/app, and how the pre-launch gate treats it (README,
 * "Pre-launch and launch"). A new route fails this test until it has a line in the table, so nobody
 * adds a way around the gate by accident.
 *
 *  - public-before-launch: visitors may open it while the site is pre-launch.
 *  - gated-by-proxy: `proxy.ts` answers 404 for it before launch (it never reaches the route).
 *  - prelaunch-aware: the route must itself hold back unfinished pages (task 119: files the proxy's
 *    matcher skips, such as the sitemap, feeds, search and share images).
 *  - infrastructure: not a visitor's page: Studio, webhooks, auth and tools with their own access
 *    rules. It reveals no unfinished page.
 */
type Classification =
  'public-before-launch' | 'gated-by-proxy' | 'prelaunch-aware' | 'infrastructure'

export const ROUTES: Record<string, [Classification, string]> = {
  // Pages
  '(prelaunch)/prelaunch-view/[[...slug]]/page.tsx': [
    'public-before-launch',
    'The bare view the gate rewrites "/" and the public pages to; the address itself answers 404.',
  ],
  '(site)/[[...slug]]/page.tsx': [
    'gated-by-proxy',
    'Every CMS page; only the listed ones are rewritten to the bare view.',
  ],
  '(site)/blog/page.tsx': ['gated-by-proxy', 'Blog index: unfinished posts.'],
  '(site)/blog/[slug]/page.tsx': ['gated-by-proxy', 'A post.'],
  '(site)/blog/category/[slug]/page.tsx': ['gated-by-proxy', 'A blog category.'],
  '(site)/events/[slug]/page.tsx': ['gated-by-proxy', 'An event page.'],
  '(site)/team/[slug]/page.tsx': ['gated-by-proxy', 'A team profile.'],
  '(site)/search/page.tsx': [
    'gated-by-proxy',
    'The results page. /api/search is prelaunch-aware below.',
  ],
  '(site)/sign-in/page.tsx': [
    'gated-by-proxy',
    'Members area: nothing to sign in to before launch.',
  ],
  '(site)/sign-out/page.tsx': ['gated-by-proxy', 'Members area.'],
  'ab/[code]/[[...slug]]/page.tsx': [
    'gated-by-proxy',
    'A/B variants are skipped before launch; the path itself answers 404.',
  ],
  'section-gallery/page.tsx': [
    'infrastructure',
    'The style guide has its own token and environment rule (styleguideAccess); the gate leaves it to that.',
  ],
  'section-gallery/stats-bar/page.tsx': ['infrastructure', 'Part of the style guide (same rule).'],
  'section-gallery/tokens/page.tsx': ['infrastructure', 'Part of the style guide (same rule).'],
  'studio-brand-preview/page.tsx': [
    'gated-by-proxy',
    'Test and design page, served only in development and e2e; 404 in production anyway.',
  ],
  'studio/[[...tool]]/page.tsx': [
    'infrastructure',
    'Sanity Studio: needs a login, outside the proxy matcher.',
  ],

  // Route handlers
  'api/auth/[...nextauth]/route.ts': ['infrastructure', 'Auth.js handlers for members.'],
  'api/draft-mode/enable/route.ts': [
    'infrastructure',
    'Studio Presentation; needs a signed secret.',
  ],
  'api/draft-mode/disable/route.ts': ['infrastructure', 'Studio Presentation.'],
  'api/revalidate/route.ts': ['infrastructure', 'Sanity webhook; verifies its signature.'],
  'api/stripe/webhook/route.ts': ['infrastructure', 'Stripe webhook; verifies its signature.'],
  'api/site-info/route.ts': [
    'infrastructure',
    'Ops dashboard: booleans and public identifiers only.',
  ],
  'api/ops-notices/route.ts': ['infrastructure', 'Ops notices; needs its shared secret.'],
  'api/experiments/route.ts': [
    'infrastructure',
    'The running A/B test, read by the proxy; no page content.',
  ],
  'api/indexnow/[key]/route.ts': ['infrastructure', 'Serves the IndexNow key file.'],
  'api/search/route.ts': ['prelaunch-aware', 'Task 119: search must not return unfinished pages.'],
  'api/og/[[...slug]]/route.tsx': [
    'prelaunch-aware',
    'Task 119: share images name unfinished pages.',
  ],
  'api/og/events/[slug]/route.tsx': [
    'prelaunch-aware',
    'Task 119: share images name unfinished events.',
  ],
  'api/events/feed/route.ts': [
    'prelaunch-aware',
    'Task 119: the calendar feed lists unfinished events.',
  ],
  'api/events/[slug]/ics/route.ts': ['prelaunch-aware', 'Task 119: an event file.'],
  'feed.xml/route.ts': ['prelaunch-aware', 'Task 119: the RSS feed lists unfinished posts.'],
  'llms.txt/route.ts': ['prelaunch-aware', 'Task 119: lists pages for AI crawlers.'],
  'robots.ts': ['prelaunch-aware', 'Task 119: robots rules and the sitemap line.'],
  'sitemap.ts': ['prelaunch-aware', 'Task 119: lists every published page.'],
}

const ROUTE_FILE = /^(page\.tsx?|route\.tsx?|robots\.ts|sitemap\.ts)$/

function routeFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return routeFiles(full, base)
    return ROUTE_FILE.test(entry.name) ? [path.relative(base, full).split(path.sep).join('/')] : []
  })
}

const found = routeFiles(path.join(process.cwd(), 'src/app'))

describe('route inventory', () => {
  it('finds the routes', () => {
    expect(found.length).toBeGreaterThan(20)
  })

  it('classifies every page and route handler, so a new one cannot skip the pre-launch decision', () => {
    const missing = found.filter((file) => !(file in ROUTES))
    expect(
      missing,
      `Add these to ROUTES in src/app/route-inventory.test.ts with a classification and a reason (README, "Pre-launch and launch"):\n${missing.join('\n')}`,
    ).toEqual([])
  })

  it('has no entry for a route that no longer exists', () => {
    expect(Object.keys(ROUTES).filter((file) => !found.includes(file))).toEqual([])
  })

  it('gives every entry a known classification and a reason', () => {
    const known = new Set([
      'public-before-launch',
      'gated-by-proxy',
      'prelaunch-aware',
      'infrastructure',
    ])
    for (const [file, [classification, reason]] of Object.entries(ROUTES)) {
      expect(known.has(classification), file).toBe(true)
      expect(reason.length, file).toBeGreaterThan(10)
    }
  })

  it('makes the pre-launch view the only page visitors can open', () => {
    const open = Object.entries(ROUTES).filter(([, [kind]]) => kind === 'public-before-launch')
    expect(open.map(([file]) => file)).toEqual(['(prelaunch)/prelaunch-view/[[...slug]]/page.tsx'])
  })
})
