/**
 * Launch-state checks (README, "Launch check"): `--prelaunch` proves a pre-launch site is private,
 * and launch mode proves the site is open and the temporary page is gone from "/". Every check is
 * pure: it takes what the CLI fetched (status, lower-case header names, text) and returns result
 * lines, so it tests offline against saved HTML and headers.
 */
import { createHash } from 'node:crypto'

import { getCanonical, getMeta, isNoindex } from './html.mjs'
import { DEFAULT_ICON_SHA256, isPlaceholderIcon } from './leftovers.mjs'
import { fail, listSome, pass, warn } from './result.mjs'

const area = 'Launch state'

/** Paths a pre-launch site must refuse when `--expect-private` names none. */
export const DEFAULT_PRIVATE_PATHS = ['/about', '/blog', '/search', '/team']

/** The slug shown at "/" before launch when /api/site-info doesn't say (the profile's default). */
export const DEFAULT_HOMEPAGE = 'links'

/** `{ status, homepage }` from /api/site-info's body, or null when it has no readable launch block. */
export function parseSiteInfoLaunch(text) {
  try {
    const launch = JSON.parse(text)?.launch
    if (
      launch &&
      (launch.status === 'prelaunch' || launch.status === 'live') &&
      typeof launch.homepage === 'string'
    ) {
      return { status: launch.status, homepage: launch.homepage }
    }
  } catch {
    // Not JSON: reported as unreadable below.
  }
  return null
}

const slugPath = (slug) => `/${slug}`
const NAV = /<nav\b|<header\b|<footer\b|data-site-chrome/i

/** Where a canonical should point: the production domain if given (a preview deployment's own domain isn't it). */
function canonicalBase(origin, expectOrigin) {
  return expectOrigin ?? origin
}

/**
 * /api/site-info reports the launch state the BUILD saw (README): `prelaunch` mode wants prelaunch,
 * launch mode wants live. A template older than the launch block has no `launch` at all.
 */
export function checkSiteInfoLaunch({ response, expected }) {
  const id = 'launch-site-info'
  const title = `/api/site-info says the site is ${expected === 'live' ? 'live' : 'pre-launch'}`
  if (!response || response.status !== 200) {
    return [
      fail(
        area,
        id,
        title,
        `/api/site-info answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
        'Deploy the template version with the launch state (CHANGELOG: "Launch state in the site profile") and check the URL.',
      ),
    ]
  }
  const launch = parseSiteInfoLaunch(response.text)
  if (!launch) {
    return [
      fail(
        area,
        id,
        title,
        '/api/site-info has no readable launch block.',
        'Update the template to a release with the launch state, and redeploy.',
      ),
    ]
  }
  if (launch.status !== expected) {
    return [
      fail(
        area,
        id,
        title,
        `It reports "${launch.status}".`,
        expected === 'live'
          ? "Set launch.status to 'live' in site.profile.ts (or remove the launch block), merge and redeploy."
          : "Set launch.status to 'prelaunch' in site.profile.ts and redeploy. A live site is open to everyone.",
      ),
    ]
  }
  return [pass(area, id, title, `Homepage: /${launch.homepage}.`)]
}

/** Before launch, "/" is the temporary page: 200, canonical to the homepage slug (never "/"). */
export function checkTemporaryHome({ response, origin, homepage, expectOrigin }) {
  const id = 'launch-temporary-home'
  const title = 'Home page shows the temporary page'
  if (!response || response.status !== 200) {
    return [
      fail(
        area,
        id,
        title,
        `"/" answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
        `Publish the "${homepage}" page in Studio (the gate answers 404 until it exists).`,
      ),
    ]
  }
  const wanted = new URL(slugPath(homepage), canonicalBase(origin, expectOrigin)).toString()
  const canonical = getCanonical(response.text)
  if (canonical !== wanted) {
    return [
      fail(
        area,
        id,
        title,
        `Its canonical is ${canonical || 'missing'}, not ${wanted}.`,
        expectOrigin
          ? 'Check NEXT_PUBLIC_SITE_URL is the production domain and the homepage slug in site.profile.ts.'
          : `Check NEXT_PUBLIC_SITE_URL and the homepage slug. On a preview deployment pass --expect-origin=<the production domain>.`,
      ),
    ]
  }
  return [pass(area, id, title, `Canonical ${wanted}.`)]
}

/** The homepage is also reachable at its own path (/links). */
export function checkHomepageOwnPath({ response, homepage }) {
  const id = 'launch-homepage-path'
  const title = `${slugPath(homepage)} is open`
  if (response?.status === 200) return [pass(area, id, title)]
  return [
    fail(
      area,
      id,
      title,
      `${slugPath(homepage)} answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
      `Publish the "${homepage}" page, or change launch.homepage in site.profile.ts.`,
    ),
  ]
}

/** noindex from the X-Robots-Tag header or the robots meta tag. */
export function hasNoindex(response) {
  return (
    isNoindex(response.headers?.['x-robots-tag'] ?? '') ||
    isNoindex(getMeta(response.text ?? '', 'robots'))
  )
}

/**
 * Each path is refused: 404, noindex, and no navigation markup in the HTML (the raw text, not what
 * is visible, since CSS-hidden chrome would still hold links to private pages).
 */
export function checkPrivatePaths({ responses }) {
  const id = 'launch-private-paths'
  const title = 'Unfinished pages are private'
  const problems = []
  for (const { path, response } of responses) {
    if (response.error) {
      problems.push(`${path}: ${response.error}`)
    } else if (response.status !== 404) {
      problems.push(`${path} answered ${String(response.status)}, not 404`)
    } else {
      if (!hasNoindex(response)) problems.push(`${path} has no noindex`)
      if (NAV.test(response.text ?? '')) problems.push(`${path} has navigation markup`)
    }
  }
  if (problems.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `${listSome(problems, 4)}.`,
        "Check launch.status is 'prelaunch' in site.profile.ts and the proxy gate is deployed (README, 'Pre-launch and launch').",
      ),
    ]
  }
  return [
    pass(
      area,
      id,
      title,
      `${listSome(
        responses.map(({ path }) => path),
        6,
      )}: 404, noindex, no navigation.`,
    ),
  ]
}

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1])

/** The pre-launch sitemap lists only public pages (the homepage and `publicPages`). */
export function checkPrelaunchSitemap({
  response,
  origin,
  homepage,
  publicPages = [],
  expectOrigin,
}) {
  const id = 'launch-sitemap'
  const title = 'Sitemap lists only public pages'
  if (!response || response.status !== 200) {
    return [
      fail(
        area,
        id,
        title,
        `/sitemap.xml answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
        'The gate rewrites /sitemap.xml to a public-pages-only file; check the proxy matcher is deployed.',
      ),
    ]
  }
  const base = canonicalBase(origin, expectOrigin)
  const allowed = new Set(
    [homepage, ...publicPages].map((slug) => new URL(slugPath(slug), base).toString()),
  )
  const listed = locs(response.text)
  const extra = listed.filter((url) => !allowed.has(url))
  if (extra.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `It also lists ${listSome(extra, 4)}.`,
        'The sitemap must come from the pre-launch handler. Check launch.status and redeploy.',
      ),
    ]
  }
  return [pass(area, id, title, `${listed.length} URL${listed.length === 1 ? '' : 's'}.`)]
}

/** feed.xml and /api/search answer 404 before launch. */
export function checkRefusedFiles({ responses }) {
  const id = 'launch-refused-files'
  const title = 'Feed and search are closed'
  const open = responses.filter(({ response }) => response.status !== 404)
  if (open.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `${listSome(
          open.map(
            ({ path, response }) =>
              `${path} answered ${response.status ? String(response.status) : response.error}`,
          ),
          3,
        )}.`,
        'The gate answers 404 for these before launch; check the proxy matcher and launch.status.',
      ),
    ]
  }
  return [pass(area, id, title, responses.map(({ path }) => path).join(', '))]
}

/** The favicon isn't Currawong's default (or the template's placeholder). */
export function checkOwnFavicon({ icons, defaultHashes = DEFAULT_ICON_SHA256 }) {
  const id = 'launch-favicon'
  const title = "Favicon isn't Currawong's"
  if (icons.length === 0) {
    return [
      warn(
        area,
        id,
        title,
        'The home page has no icon link.',
        'Set the Browser icon in Website settings → Name, logo & icon, or keep src/app/icon.png.',
      ),
    ]
  }
  const defaults = icons.filter(
    (icon) =>
      icon.status === 200 &&
      ((icon.bytes &&
        defaultHashes.includes(createHash('sha256').update(icon.bytes).digest('hex'))) ||
        (/svg/i.test(icon.contentType ?? '') && isPlaceholderIcon(icon.body ?? ''))),
  )
  if (defaults.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `${listSome(
          defaults.map((icon) => icon.href),
          3,
        )} is still the default icon. The client shares this page before launch.`,
        'In Studio, open Website settings → Name, logo & icon → Browser icon and upload the client’s icon.',
      ),
    ]
  }
  return [pass(area, id, title)]
}

/**
 * The share image the temporary page advertises (its og:image, made absolute against the page), or
 * the generated one at /api/og/<homepage> when it names none.
 */
export function shareImageUrl(html, origin, homepage) {
  const declared = getMeta(html ?? '', 'og:image')
  if (declared) {
    try {
      return new URL(declared, origin).toString()
    } catch {
      // An unreadable value: fall back to the generated image.
    }
  }
  return `${origin}/api/og/${homepage}`
}

/** The share image of the temporary page returns an image. */
export function checkShareImage({ response, path }) {
  const id = 'launch-share-image'
  const title = 'Temporary page has a share image'
  if (response.status === 200 && /^image\//i.test(response.contentType ?? '')) {
    return [pass(area, id, title, path)]
  }
  return [
    fail(
      area,
      id,
      title,
      `${path} answered ${response.status ? String(response.status) : (response.error ?? 'nothing')}${response.contentType ? ` (${response.contentType})` : ''}.`,
      'The gate allows the share image for public pages only. Check the homepage is published and listed.',
    ),
  ]
}

/** Launch mode: "/" is the real home page, not the temporary one (its canonical is "/"). */
export function checkLaunchedHome({ response, origin, homepage, expectOrigin }) {
  const id = 'launch-live-home'
  const title = 'Home page is the real home page'
  if (!response || response.status !== 200) {
    return [
      fail(
        area,
        id,
        title,
        `"/" answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
        'Publish the page with the slug "home" in Studio.',
      ),
    ]
  }
  const base = canonicalBase(origin, expectOrigin)
  const canonical = getCanonical(response.text)
  const root = new URL('/', base).toString()
  const temporary = new URL(slugPath(homepage), base).toString()
  if (canonical === temporary) {
    return [
      fail(
        area,
        id,
        title,
        `"/" still shows the temporary page (canonical ${canonical}).`,
        'Set launch.status to \'live\' in site.profile.ts, merge and redeploy; check that a page with the slug "home" is published.',
      ),
    ]
  }
  if (canonical !== root) {
    return [
      fail(
        area,
        id,
        title,
        `Its canonical is ${canonical || 'missing'}, not ${root}.`,
        'Check NEXT_PUBLIC_SITE_URL, or pass --expect-origin=<the production domain> on a preview deployment.',
      ),
    ]
  }
  return [pass(area, id, title, `Canonical ${root}.`)]
}

/** Launch mode: the temporary page (e.g. /links) is still there, so shared links keep working. */
export function checkTemporaryStillUp({ response, homepage }) {
  const id = 'launch-temporary-up'
  const title = `${slugPath(homepage)} still answers`
  if (response?.status === 200) return [pass(area, id, title)]
  return [
    warn(
      area,
      id,
      title,
      `${slugPath(homepage)} answered ${response?.status ? String(response.status) : (response?.error ?? 'nothing')}.`,
      'People may have shared this address. Keep the page published, or add a redirect in Studio → Redirects.',
    ),
  ]
}

/** Private paths for `--prelaunch`: those given, or the built-in sample. */
export const privatePathsFor = (given) =>
  given && given.length > 0 ? given : DEFAULT_PRIVATE_PATHS
