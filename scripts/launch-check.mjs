/**
 * Checks whether a deployed site is ready to go live: `npm run launch:check -- https://example.com`.
 * With `--prelaunch` it proves instead that a pre-launch site is private and its temporary page is
 * right (README, "Launch check"); `--bypass` sends Vercel's protection-bypass header so a protected
 * preview deployment can be checked.
 * Each check is a pure function in scripts/launch-check/*.mjs (unit-tested against saved HTML and
 * header fixtures); this file only fetches, hands the data to them and prints the table.
 *
 * Prints a table of pass, warning and fail lines with how to fix each, and exits 1 on any failure.
 * `--json` prints the same results as JSON for the future Ops dashboard. Dependency-free. Reads
 * .env.local (and the environment) for the Sanity and PageSpeed values; nothing is ever printed from it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseEnv } from './check-dataset.mjs'
import { normaliseSiteUrl, parseArgs } from './launch-check/args.mjs'
import { discoverPages, onOrigin } from './launch-check/discover.mjs'
import { getIconLinks } from './launch-check/html.mjs'
import {
  checkHomePage,
  checkHttpRedirect,
  checkNotFound,
  checkSecurityHeaders,
  checkStudio,
  checkWwwApex,
  wwwCounterpart,
} from './launch-check/http.mjs'
import {
  checkLocalhostLinks,
  checkPlaceholderIcons,
  checkTemplateCopy,
} from './launch-check/leftovers.mjs'
import { followRedirects, request } from './launch-check/net.mjs'
import { mapLimit } from './launch-check/pool.mjs'
import {
  checkHomepageOwnPath,
  checkLaunchedHome,
  checkOwnFavicon,
  checkPrelaunchSitemap,
  checkPrivatePaths,
  checkRefusedFiles,
  checkShareImage,
  checkSiteInfoLaunch,
  checkTemporaryHome,
  checkTemporaryStillUp,
  DEFAULT_HOMEPAGE,
  parseSiteInfoLaunch,
  privatePathsFor,
  shareImageUrl,
} from './launch-check/prelaunch.mjs'
import { evaluatePsi, psiEndpoint } from './launch-check/psi.mjs'
import { fail, formatSummary, formatTable, summarise } from './launch-check/result.mjs'
import {
  checkCorsOrigin,
  checkDatasetPrivate,
  checkRevalidateWebhook,
} from './launch-check/sanity.mjs'
import {
  checkSitemapEntries,
  checkCanonicals,
  checkIndexable,
  checkOgImages,
  checkRobots,
  checkSingleH1,
  checkSitemapStatuses,
  checkUniqueMetadata,
  collectOgImages,
} from './launch-check/seo.mjs'

const noop = () => undefined
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NOT_FOUND_PATH = '/launch-check-this-page-should-not-exist'
const HELP = `Usage: npm run launch:check -- <url> [--json] [--max-urls=N]
       npm run launch:check -- <url> --prelaunch [--expect-private=/about,/blog] [--expect-public=/privacy] [--bypass] [--expect-origin=URL]

Checks a deployed site before launch: HTTP and headers, SEO, template leftovers, 404s and Sanity,
and that the site is live and "/" is the real home page. Exit code 1 means at least one check failed.
--json prints machine-readable results.
Set PSI_API_KEY (environment or .env.local) to add PageSpeed Insights scores.

--prelaunch   Prove a pre-launch site is private: "/" is the temporary page, the paths in
              --expect-private (default /about, /blog, /search, /team) answer 404 with noindex and no
              navigation, the sitemap lists only public pages, the feed and search are closed, the
              favicon is the client's, and the share image works.
--bypass      Send x-vercel-protection-bypass (VERCEL_AUTOMATION_BYPASS_SECRET from the environment or
              .env.local; never printed) to the site, to check a protected Vercel preview deployment.
              A preview's canonicals name the production domain, so also pass --expect-origin.
--expect-public=/a,/b  Pages in launch.publicPages, so the sitemap may list them.
--expect-origin=URL  The production domain canonicals should use, e.g. https://example.com.au.`

/** Only the values the checks read; .env.local first, the environment on top. */
function loadEnv() {
  const path = join(root, '.env.local')
  const file = existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
  const env = {}
  for (const key of [
    'NEXT_PUBLIC_SANITY_PROJECT_ID',
    'NEXT_PUBLIC_SANITY_DATASET',
    'SANITY_API_READ_TOKEN',
    'PSI_API_KEY',
    'VERCEL_AUTOMATION_BYPASS_SECRET',
  ]) {
    env[key] = process.env[key] || file[key] || ''
  }
  return env
}

const isHtml = (response) =>
  response.status === 200 && /html/i.test(response.contentType) && response.text !== ''

/**
 * The network functions, optionally sending Vercel's protection-bypass header. It is sent only to the
 * site's own host, so a redirect to another site never receives the secret.
 */
export function makeNet(origin, bypassSecret) {
  if (!bypassSecret) return { request, followRedirects }
  const host = new URL(origin).host
  const withBypass = (url, options = {}) =>
    new URL(url).host === host
      ? { ...options, headers: { ...options.headers, 'x-vercel-protection-bypass': bypassSecret } }
      : options
  return {
    request: (url, options) => request(url, withBypass(url, options)),
    followRedirects: (url, options) => followRedirects(url, withBypass(url, options)),
  }
}

export async function runLaunchChecks({ origin, env, maxUrls, expectOrigin, net, log = noop }) {
  const { request, followRedirects } = net ?? makeNet(origin)
  const results = []
  const notes = []
  const host = new URL(origin).hostname

  log('Fetching the home page…')
  const home = await followRedirects(`${origin}/`)
  results.push(...checkHomePage({ ...home, origin }))
  if (home.final.error) return { results, notes }
  const siteOrigin = new URL(home.final.url).origin

  log('Checking the launch state…')
  const siteInfo = await request(`${siteOrigin}/api/site-info`)
  results.push(...checkSiteInfoLaunch({ response: siteInfo, expected: 'live' }))
  const homepage = parseSiteInfoLaunch(siteInfo.text)?.homepage ?? DEFAULT_HOMEPAGE
  const temporary = await request(`${siteOrigin}/${homepage}`)
  results.push(
    ...checkLaunchedHome({ response: home.final, origin: siteOrigin, homepage, expectOrigin }),
  )
  results.push(...checkTemporaryStillUp({ response: temporary, homepage }))

  log('Checking redirects, headers, Studio and 404s…')
  const counterpart = wwwCounterpart(host)
  const [httpVariant, otherVariant, studio, notFound, robots, webhook] = await Promise.all([
    new URL(origin).protocol === 'https:'
      ? followRedirects(`http://${new URL(origin).host}/`)
      : Promise.resolve(null),
    counterpart ? followRedirects(`https://${counterpart}/`) : Promise.resolve(null),
    followRedirects(`${siteOrigin}/studio`),
    request(`${siteOrigin}${NOT_FOUND_PATH}`),
    request(`${siteOrigin}/robots.txt`, { follow: true }),
    request(`${siteOrigin}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"_type":"page"}',
    }),
  ])
  if (httpVariant)
    results.push(
      ...checkHttpRedirect({ httpChain: httpVariant.chain, httpFinal: httpVariant.final }),
    )
  if (otherVariant) {
    results.push(...checkWwwApex({ siteHost: host, site: home, other: otherVariant }))
  }
  results.push(...checkSecurityHeaders({ headers: home.final.headers }))
  results.push(...checkStudio({ final: studio.final }))
  results.push(...checkNotFound({ response: notFound, path: NOT_FOUND_PATH }))

  log('Reading robots.txt and the sitemap…')
  results.push(...checkRobots({ status: robots.status, text: robots.text, origin: siteOrigin }))
  const sitemap = await discoverPages({
    origin: siteOrigin,
    robotsText: robots.text,
    request,
    cap: maxUrls,
  })
  results.push(...checkSitemapEntries({ ...sitemap, origin: siteOrigin }))

  // The home page is always checked, even when the sitemap omits it.
  const homeHref = new URL(`${siteOrigin}/`).href
  const targets = [
    ...new Set([homeHref, ...sitemap.urls.map((url) => new URL(onOrigin(url, siteOrigin)).href)]),
  ]
  log(`Fetching ${targets.length} page${targets.length === 1 ? '' : 's'}…`)
  const fetched = await mapLimit(targets, 6, (url) =>
    url === homeHref && isHtml(home.final) ? Promise.resolve(home.final) : request(url),
  )
  results.push(
    ...checkSitemapStatuses({
      statuses: fetched
        .map((response, index) => ({
          url: targets[index],
          status: response.status,
          redirectedTo: response.headers.location,
          error: response.error,
        }))
        // The home page may be listed with or without a slash; only sitemap URLs are judged.
        .filter(
          (entry) =>
            entry.url === homeHref ||
            sitemap.urls.some((url) => new URL(onOrigin(url, siteOrigin)).href === entry.url),
        ),
    }),
  )
  const pages = fetched
    .map((response, index) => ({ response, url: targets[index] }))
    .filter(({ response }) => isHtml(response))
    .map(({ response, url }) => ({ url, html: response.text, headers: response.headers }))

  results.push(...checkCanonicals({ pages, origin: siteOrigin }))
  results.push(...checkUniqueMetadata({ pages }))
  results.push(...checkSingleH1({ pages }))
  results.push(
    ...checkIndexable({
      pages,
      homeUrl: homeHref,
      headerValues: Object.fromEntries(
        pages.map((page) => [page.url, page.headers['x-robots-tag'] ?? '']),
      ),
    }),
  )

  log('Checking share images and icons…')
  const { images, missing } = collectOgImages(pages)
  const imageUrls = [...images.keys()].slice(0, 25)
  const imageResults = await mapLimit(imageUrls, 6, (url) => request(url, { follow: true }))
  results.push(
    ...checkOgImages({
      fetched: imageResults.map((response, index) => ({
        url: imageUrls[index],
        status: response.status,
        contentType: response.contentType,
        error: response.error,
      })),
      missing,
      total: pages.length,
    }),
  )
  const homePage = pages.find((page) => page.url === homeHref)
  const iconHrefs = [...new Set(getIconLinks(homePage?.html ?? '').map((icon) => icon.href))].slice(
    0,
    5,
  )
  const icons = await mapLimit(iconHrefs, 5, async (href) => {
    const response = await request(new URL(href, siteOrigin).toString(), {
      follow: true,
      bytes: true,
    })
    return {
      href,
      status: response.status,
      contentType: response.contentType,
      body: response.text,
      bytes: response.bytes,
    }
  })
  results.push(...checkPlaceholderIcons({ icons }))
  results.push(...checkTemplateCopy({ pages }))
  results.push(...checkLocalhostLinks({ pages }))

  log('Checking Sanity…')
  results.push(...(await checkDatasetPrivate({ env })))
  results.push(...(await checkCorsOrigin({ origin: siteOrigin, env })))
  results.push(...checkRevalidateWebhook({ response: webhook }))

  if (env.PSI_API_KEY) {
    log('Asking PageSpeed Insights (this takes a minute)…')
    for (const strategy of ['mobile', 'desktop']) {
      let status = 0
      let body = null
      try {
        const response = await fetch(psiEndpoint(home.final.url, strategy, env.PSI_API_KEY), {
          signal: AbortSignal.timeout(120_000),
        })
        status = response.status
        body = await response.json()
      } catch {
        // evaluatePsi reports "didn't return scores".
      }
      results.push(...evaluatePsi({ strategy, status, body }))
    }
  } else {
    notes.push('PageSpeed Insights skipped: set PSI_API_KEY to include it.')
  }
  return { results, notes }
}

/** `--prelaunch`: proves the gate holds. Nothing here crawls; it reads a handful of paths. */
export async function runPrelaunchChecks({
  origin,
  expectOrigin,
  privatePaths,
  publicPages = [],
  net,
  log = noop,
}) {
  const { request } = net ?? makeNet(origin)
  const results = []
  const notes = []

  log('Reading /api/site-info…')
  const siteInfo = await request(`${origin}/api/site-info`)
  results.push(...checkSiteInfoLaunch({ response: siteInfo, expected: 'prelaunch' }))
  const launch = parseSiteInfoLaunch(siteInfo.text)
  if (!launch) return { results, notes }
  if (launch.status !== 'prelaunch') {
    notes.push('The remaining checks need a pre-launch site, so they were skipped.')
    return { results, notes }
  }
  const { homepage } = launch

  log('Fetching the temporary page…')
  const [home, own, sitemap, feed, search] = await Promise.all([
    request(`${origin}/`, { follow: true }),
    request(`${origin}/${homepage}`),
    request(`${origin}/sitemap.xml`, { follow: true }),
    request(`${origin}/feed.xml`),
    request(`${origin}/api/search?q=a`),
  ])
  // The image the page itself names for sharing (it may be an uploaded one), not only the generated one.
  const ogImageUrl = shareImageUrl(home.text, origin, homepage)
  const ogImage = await request(ogImageUrl, { follow: true })
  results.push(...checkTemporaryHome({ response: home, origin, homepage, expectOrigin }))
  results.push(...checkHomepageOwnPath({ response: own, homepage }))

  log('Checking that unfinished pages are private…')
  const paths = privatePathsFor(privatePaths)
  const refused = await Promise.all(paths.map((path) => request(`${origin}${path}`)))
  results.push(
    ...checkPrivatePaths({
      responses: paths.map((path, index) => ({ path, response: refused[index] })),
    }),
  )
  results.push(
    ...checkPrelaunchSitemap({
      response: sitemap,
      origin,
      homepage,
      publicPages: publicPages.map((path) => path.replace(/^\//, '')),
      expectOrigin,
    }),
    ...checkRefusedFiles({
      responses: [
        { path: '/feed.xml', response: feed },
        { path: '/api/search?q=a', response: search },
      ],
    }),
  )
  log('Checking the favicon and share image…')
  const iconHrefs = [...new Set(getIconLinks(home.text ?? '').map((icon) => icon.href))].slice(0, 5)
  const icons = await mapLimit(iconHrefs, 5, async (href) => {
    const response = await request(new URL(href, origin).toString(), { follow: true, bytes: true })
    return {
      href,
      status: response.status,
      contentType: response.contentType,
      body: response.text,
      bytes: response.bytes,
    }
  })
  results.push(...checkOwnFavicon({ icons }))
  results.push(
    ...checkShareImage({
      response: ogImage,
      path: ogImageUrl.startsWith(`${origin}/`) ? ogImageUrl.slice(origin.length) : ogImageUrl,
    }),
  )
  return { results, notes }
}

async function main() {
  let options
  let origin
  try {
    options = parseArgs(process.argv.slice(2))
    if (!options.help) origin = normaliseSiteUrl(options.url)
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${HELP}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    return
  }

  const log = options.json ? noop : (message) => console.error(`… ${message}`)
  const env = loadEnv()
  if (options.bypass && !env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    console.error(
      '--bypass needs VERCEL_AUTOMATION_BYPASS_SECRET in the environment or .env.local (Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation).',
    )
    process.exit(2)
  }
  const net = makeNet(origin, options.bypass ? env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined)
  const mode = options.prelaunch ? 'prelaunch' : 'launch'
  let outcome
  try {
    outcome =
      mode === 'prelaunch'
        ? await runPrelaunchChecks({
            origin,
            expectOrigin: options.expectOrigin,
            privatePaths: options.expectPrivate,
            publicPages: options.expectPublic,
            net,
            log,
          })
        : await runLaunchChecks({
            origin,
            env,
            maxUrls: options.maxUrls,
            expectOrigin: options.expectOrigin,
            net,
            log,
          })
    if (options.bypass) {
      outcome.notes.push(
        options.expectOrigin
          ? `Bypass header sent. Canonicals are checked against ${options.expectOrigin}.`
          : 'Bypass header sent. A preview deployment’s canonicals name the production domain: pass --expect-origin=https://your-domain to check them.',
      )
    }
  } catch (error) {
    outcome = {
      results: [
        fail(
          'Run',
          'run-crashed',
          'The checks stopped early',
          error instanceof Error ? error.message : String(error),
          'Run it again; if it repeats, report it with this message.',
        ),
      ],
      notes: [],
    }
  }
  const summary = summarise(outcome.results)
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          url: origin,
          mode,
          checkedAt: new Date().toISOString(),
          summary,
          results: outcome.results,
          notes: outcome.notes,
        },
        null,
        2,
      ),
    )
  } else {
    const colour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
    console.log(`\n${mode === 'prelaunch' ? 'Pre-launch check' : 'Launch check'} for ${origin}\n`)
    console.log(formatTable(outcome.results, { colour }))
    for (const note of outcome.notes) console.log(`\n${note}`)
    console.log(
      `\n${formatSummary(
        summary,
        mode === 'prelaunch'
          ? { ready: 'Private and ready to share', notReady: 'Not private yet' }
          : undefined,
      )}`,
    )
    if (!summary.ok) console.log('Fix the failures above, deploy, and run it again.')
  }
  if (!summary.ok) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
