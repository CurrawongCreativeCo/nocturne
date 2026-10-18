import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseArgs } from './args.mjs'
import { DEFAULT_ICON_SHA256 } from './leftovers.mjs'
import {
  DEFAULT_PRIVATE_PATHS,
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
  parseSiteInfoLaunch,
  privatePathsFor,
  shareImageUrl,
} from './prelaunch.mjs'
import { makeNet } from '../launch-check.mjs'

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const response = (status, extra = {}) => ({
  url: 'https://example.com.au/x',
  status,
  headers: {},
  contentType: 'text/html',
  text: '',
  ...extra,
})
const ORIGIN = 'https://example.com.au'
const statuses = (results) => results.map((result) => result.status)
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow' }

describe('parseSiteInfoLaunch', () => {
  it('reads the launch block', () => {
    expect(parseSiteInfoLaunch(fixture('site-info-prelaunch.json'))).toEqual({
      status: 'prelaunch',
      homepage: 'links',
    })
    expect(parseSiteInfoLaunch(fixture('site-info-live.json'))?.status).toBe('live')
  })

  it('is null without one, or for junk', () => {
    expect(parseSiteInfoLaunch(fixture('site-info-old.json'))).toBeNull()
    expect(parseSiteInfoLaunch('not json')).toBeNull()
    expect(parseSiteInfoLaunch('{"launch":{"status":"soon","homepage":"x"}}')).toBeNull()
    expect(parseSiteInfoLaunch('{"launch":{"status":"live"}}')).toBeNull()
  })
})

describe('checkSiteInfoLaunch', () => {
  const siteInfo = (name) => response(200, { text: fixture(name), contentType: 'application/json' })

  it('passes when the state matches the mode', () => {
    expect(
      statuses(
        checkSiteInfoLaunch({
          response: siteInfo('site-info-prelaunch.json'),
          expected: 'prelaunch',
        }),
      ),
    ).toEqual(['pass'])
    expect(
      statuses(
        checkSiteInfoLaunch({ response: siteInfo('site-info-live.json'), expected: 'live' }),
      ),
    ).toEqual(['pass'])
  })

  it('fails when --prelaunch meets a live site, and when launch mode meets a pre-launch one', () => {
    const live = checkSiteInfoLaunch({
      response: siteInfo('site-info-live.json'),
      expected: 'prelaunch',
    })
    expect(live[0]).toMatchObject({ status: 'fail' })
    expect(live[0].detail).toContain('"live"')
    const pre = checkSiteInfoLaunch({
      response: siteInfo('site-info-prelaunch.json'),
      expected: 'live',
    })
    expect(pre[0]).toMatchObject({ status: 'fail' })
    expect(pre[0].fix).toContain("'live'")
  })

  it('fails on an old template with no launch block, a failed request or a non-200', () => {
    expect(
      statuses(checkSiteInfoLaunch({ response: siteInfo('site-info-old.json'), expected: 'live' })),
    ).toEqual(['fail'])
    expect(statuses(checkSiteInfoLaunch({ response: response(404), expected: 'live' }))).toEqual([
      'fail',
    ])
    expect(
      statuses(
        checkSiteInfoLaunch({ response: response(0, { error: 'ENOTFOUND' }), expected: 'live' }),
      ),
    ).toEqual(['fail'])
  })
})

describe('checkTemporaryHome', () => {
  const home = response(200, { text: fixture('prelaunch-home.html') })

  it('passes with a 200 and a canonical to the homepage slug', () => {
    expect(
      statuses(checkTemporaryHome({ response: home, origin: ORIGIN, homepage: 'links' })),
    ).toEqual(['pass'])
  })

  it('fails when the canonical is "/" or another page', () => {
    const live = response(200, { text: fixture('live-home.html') })
    const result = checkTemporaryHome({ response: live, origin: ORIGIN, homepage: 'links' })
    expect(result[0]).toMatchObject({ status: 'fail' })
    expect(result[0].detail).toContain('https://example.com.au/,')
    expect(
      statuses(checkTemporaryHome({ response: home, origin: ORIGIN, homepage: 'welcome' })),
    ).toEqual(['fail'])
  })

  it('fails when "/" does not answer 200', () => {
    expect(
      statuses(checkTemporaryHome({ response: response(404), origin: ORIGIN, homepage: 'links' })),
    ).toEqual(['fail'])
  })

  it('checks the canonical against --expect-origin on a preview deployment', () => {
    const args = { response: home, origin: 'https://site-git-x.vercel.app', homepage: 'links' }
    expect(statuses(checkTemporaryHome(args))).toEqual(['fail'])
    expect(statuses(checkTemporaryHome({ ...args, expectOrigin: ORIGIN }))).toEqual(['pass'])
  })
})

describe('checkHomepageOwnPath', () => {
  it('passes on 200 and fails otherwise', () => {
    expect(statuses(checkHomepageOwnPath({ response: response(200), homepage: 'links' }))).toEqual([
      'pass',
    ])
    expect(statuses(checkHomepageOwnPath({ response: response(404), homepage: 'links' }))).toEqual([
      'fail',
    ])
  })
})

describe('checkPrivatePaths', () => {
  const refused = (path) => ({
    path,
    response: response(404, { text: fixture('prelaunch-404.html'), headers: NOINDEX }),
  })

  it('passes when every path is a bare 404 with noindex', () => {
    expect(statuses(checkPrivatePaths({ responses: DEFAULT_PRIVATE_PATHS.map(refused) }))).toEqual([
      'pass',
    ])
  })

  it('accepts noindex from the meta tag alone', () => {
    const noHeader = {
      path: '/about',
      response: response(404, { text: fixture('prelaunch-404.html') }),
    }
    expect(statuses(checkPrivatePaths({ responses: [noHeader] }))).toEqual(['pass'])
  })

  it('fails on a path that opens', () => {
    const open = { path: '/about', response: response(200, { text: fixture('live-home.html') }) }
    const result = checkPrivatePaths({ responses: [refused('/blog'), open] })
    expect(result[0]).toMatchObject({ status: 'fail' })
    expect(result[0].detail).toContain('/about answered 200, not 404')
  })

  it('fails on a 404 without noindex', () => {
    const plain = {
      path: '/about',
      response: response(404, { text: '<html><body>Gone</body></html>' }),
    }
    expect(checkPrivatePaths({ responses: [plain] })[0].detail).toContain('/about has no noindex')
  })

  it('fails on a 404 with navigation in the HTML, even if it is hidden', () => {
    const nav = {
      path: '/about',
      response: response(404, { text: fixture('live-404-with-nav.html'), headers: NOINDEX }),
    }
    expect(checkPrivatePaths({ responses: [nav] })[0].detail).toContain(
      '/about has navigation markup',
    )
  })

  it('reports a request that failed', () => {
    const broken = { path: '/about', response: response(0, { error: 'timeout' }) }
    expect(checkPrivatePaths({ responses: [broken] })[0].detail).toContain('/about: timeout')
  })

  it('uses the given paths, else the built-in sample', () => {
    expect(privatePathsFor([])).toEqual(['/about', '/blog', '/search', '/team'])
    expect(privatePathsFor(undefined)).toEqual(DEFAULT_PRIVATE_PATHS)
    expect(privatePathsFor(['/pricing'])).toEqual(['/pricing'])
  })
})

describe('checkPrelaunchSitemap', () => {
  const sitemap = (name) => response(200, { text: fixture(name), contentType: 'application/xml' })

  it('passes when it lists only the homepage', () => {
    expect(
      statuses(
        checkPrelaunchSitemap({
          response: sitemap('sitemap-prelaunch.xml'),
          origin: ORIGIN,
          homepage: 'links',
        }),
      ),
    ).toEqual(['pass'])
  })

  it('fails when it lists anything else, naming it', () => {
    const result = checkPrelaunchSitemap({
      response: sitemap('sitemap-leaky.xml'),
      origin: ORIGIN,
      homepage: 'links',
    })
    expect(result[0]).toMatchObject({ status: 'fail' })
    expect(result[0].detail).toContain('/about')
    expect(result[0].detail).toContain('/blog/hello')
  })

  it('allows the pages named as public', () => {
    const result = checkPrelaunchSitemap({
      response: sitemap('sitemap-leaky.xml'),
      origin: ORIGIN,
      homepage: 'links',
      publicPages: ['about', 'blog/hello'],
    })
    expect(statuses(result)).toEqual(['pass'])
  })

  it('accepts an empty urlset (a noindex homepage)', () => {
    const empty = response(200, {
      text: '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    })
    expect(
      statuses(checkPrelaunchSitemap({ response: empty, origin: ORIGIN, homepage: 'links' })),
    ).toEqual(['pass'])
  })

  it('fails when the sitemap is missing', () => {
    expect(
      statuses(
        checkPrelaunchSitemap({ response: response(404), origin: ORIGIN, homepage: 'links' }),
      ),
    ).toEqual(['fail'])
  })

  it('compares against --expect-origin', () => {
    const args = {
      response: sitemap('sitemap-prelaunch.xml'),
      origin: 'https://x.vercel.app',
      homepage: 'links',
    }
    expect(statuses(checkPrelaunchSitemap(args))).toEqual(['fail'])
    expect(statuses(checkPrelaunchSitemap({ ...args, expectOrigin: ORIGIN }))).toEqual(['pass'])
  })
})

describe('checkRefusedFiles', () => {
  it('passes when the feed and search answer 404', () => {
    const responses = [
      { path: '/feed.xml', response: response(404) },
      { path: '/api/search?q=a', response: response(404) },
    ]
    expect(statuses(checkRefusedFiles({ responses }))).toEqual(['pass'])
  })

  it('fails on one that answers', () => {
    const result = checkRefusedFiles({
      responses: [
        { path: '/feed.xml', response: response(200) },
        { path: '/api/search?q=a', response: response(404) },
      ],
    })
    expect(result[0]).toMatchObject({ status: 'fail' })
    expect(result[0].detail).toContain('/feed.xml answered 200')
  })
})

describe('checkOwnFavicon', () => {
  const png = Buffer.from('currawong default icon bytes')
  const sha = 'sha-of-the-fixture-bytes'

  it("fails when the icon is Currawong's default, byte for byte", async () => {
    const { createHash } = await import('node:crypto')
    const hash = createHash('sha256').update(png).digest('hex')
    const icons = [{ href: '/icon.png', status: 200, contentType: 'image/png', bytes: png }]
    expect(statuses(checkOwnFavicon({ icons, defaultHashes: [hash] }))).toEqual(['fail'])
    expect(statuses(checkOwnFavicon({ icons, defaultHashes: [sha] }))).toEqual(['pass'])
    expect(DEFAULT_ICON_SHA256.length).toBeGreaterThan(0)
  })

  it('fails on the template’s placeholder SVG', () => {
    const icons = [
      {
        href: '/icon.svg',
        status: 200,
        contentType: 'image/svg+xml',
        body: fixture('icon-placeholder.svg'),
      },
    ]
    expect(statuses(checkOwnFavicon({ icons }))).toEqual(['fail'])
  })

  it('passes for a custom SVG, and warns when there is no icon link', () => {
    const icons = [
      {
        href: '/icon.svg',
        status: 200,
        contentType: 'image/svg+xml',
        body: fixture('icon-custom.svg'),
      },
    ]
    expect(statuses(checkOwnFavicon({ icons }))).toEqual(['pass'])
    expect(statuses(checkOwnFavicon({ icons: [] }))).toEqual(['warn'])
  })
})

describe('shareImageUrl', () => {
  const origin = 'https://example.com.au'
  it('uses the og:image the page names, made absolute', () => {
    expect(
      shareImageUrl(
        '<meta property="og:image" content="https://cdn.sanity.io/images/p/d/a.png">',
        origin,
        'links',
      ),
    ).toBe('https://cdn.sanity.io/images/p/d/a.png')
    expect(
      shareImageUrl('<meta property="og:image" content="/api/og/links?v=2">', origin, 'links'),
    ).toBe('https://example.com.au/api/og/links?v=2')
  })

  it('falls back to the generated image when the page names none', () => {
    expect(shareImageUrl('<title>Links</title>', origin, 'links')).toBe(
      'https://example.com.au/api/og/links',
    )
    expect(shareImageUrl(undefined, origin, 'links')).toBe('https://example.com.au/api/og/links')
  })
})

describe('checkShareImage', () => {
  it('passes for an image and fails otherwise', () => {
    expect(
      statuses(
        checkShareImage({
          response: response(200, { contentType: 'image/png' }),
          path: '/api/og/links',
        }),
      ),
    ).toEqual(['pass'])
    expect(statuses(checkShareImage({ response: response(404), path: '/api/og/links' }))).toEqual([
      'fail',
    ])
    expect(
      statuses(
        checkShareImage({
          response: response(200, { contentType: 'text/html' }),
          path: '/api/og/links',
        }),
      ),
    ).toEqual(['fail'])
  })
})

describe('launch mode checks', () => {
  it('checkLaunchedHome passes on a real home page with canonical "/"', () => {
    const home = response(200, { text: fixture('live-home.html') })
    expect(
      statuses(checkLaunchedHome({ response: home, origin: ORIGIN, homepage: 'links' })),
    ).toEqual(['pass'])
  })

  it('checkLaunchedHome fails while "/" is still the temporary page', () => {
    const temporary = response(200, { text: fixture('prelaunch-home.html') })
    const result = checkLaunchedHome({ response: temporary, origin: ORIGIN, homepage: 'links' })
    expect(result[0]).toMatchObject({ status: 'fail' })
    expect(result[0].detail).toContain('temporary page')
  })

  it('checkLaunchedHome fails on a missing page or a wrong canonical, and honours --expect-origin', () => {
    expect(
      statuses(checkLaunchedHome({ response: response(404), origin: ORIGIN, homepage: 'links' })),
    ).toEqual(['fail'])
    const home = response(200, { text: fixture('live-home.html') })
    expect(
      statuses(
        checkLaunchedHome({ response: home, origin: 'https://x.vercel.app', homepage: 'links' }),
      ),
    ).toEqual(['fail'])
    expect(
      statuses(
        checkLaunchedHome({
          response: home,
          origin: 'https://x.vercel.app',
          homepage: 'links',
          expectOrigin: ORIGIN,
        }),
      ),
    ).toEqual(['pass'])
  })

  it('checkTemporaryStillUp passes on 200 and warns otherwise (shared links)', () => {
    expect(statuses(checkTemporaryStillUp({ response: response(200), homepage: 'links' }))).toEqual(
      ['pass'],
    )
    expect(statuses(checkTemporaryStillUp({ response: response(404), homepage: 'links' }))).toEqual(
      ['warn'],
    )
  })
})

describe('arguments for the launch states', () => {
  it('parses --prelaunch, --bypass, --expect-origin and --expect-private', () => {
    const options = parseArgs([
      'https://x.vercel.app',
      '--prelaunch',
      '--bypass',
      '--expect-origin=example.com.au',
      '--expect-private=/about,/blog',
      '--expect-private=/team',
      '--expect-public=/privacy',
    ])
    expect(options).toMatchObject({
      prelaunch: true,
      bypass: true,
      expectOrigin: 'https://example.com.au',
      expectPrivate: ['/about', '/blog', '/team'],
      expectPublic: ['/privacy'],
    })
  })

  it('defaults them off', () => {
    expect(parseArgs(['x.com'])).toMatchObject({
      prelaunch: false,
      bypass: false,
      expectOrigin: undefined,
      expectPrivate: [],
      expectPublic: [],
    })
  })

  it('rejects junk', () => {
    expect(() => parseArgs(['--expect-private=about'])).toThrow('start with "/"')
    expect(() => parseArgs(['--expect-private=//evil.example'])).toThrow('start with "/"')
    expect(() => parseArgs(['--expect-private='])).toThrow('at least one path')
    expect(() => parseArgs(['--expect-origin='])).toThrow('Pass the site URL')
    expect(() => parseArgs(['--expect-origin=ftp://x.com'])).toThrow("isn't a web address")
  })
})

describe('makeNet (the bypass header)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const stubFetch = () => {
    const calls = []
    vi.stubGlobal('fetch', (url, init) => {
      calls.push({ url: String(url), headers: init.headers })
      return Promise.resolve(
        new Response('', { status: 200, headers: { 'content-type': 'text/plain' } }),
      )
    })
    return calls
  }

  it('returns the plain functions without a secret', async () => {
    const { request } = await import('./net.mjs')
    expect(makeNet(ORIGIN).request).toBe(request)
  })

  it('sends x-vercel-protection-bypass to the site’s own host only', async () => {
    const calls = stubFetch()
    const net = makeNet('https://site-git-x.vercel.app', 'secret-value')
    await net.request('https://site-git-x.vercel.app/api/site-info')
    await net.request('https://other.example/elsewhere')
    expect(calls[0].headers['x-vercel-protection-bypass']).toBe('secret-value')
    expect(calls[1].headers['x-vercel-protection-bypass']).toBeUndefined()
  })

  it('keeps sending it across a redirect on the same host', async () => {
    const calls = []
    vi.stubGlobal('fetch', (url, init) => {
      calls.push({ url: String(url), headers: init.headers })
      return Promise.resolve(
        calls.length === 1
          ? new Response('', { status: 307, headers: { location: '/links' } })
          : new Response('', { status: 200, headers: { 'content-type': 'text/plain' } }),
      )
    })
    const net = makeNet('https://site-git-x.vercel.app', 'secret-value')
    await net.followRedirects('https://site-git-x.vercel.app/')
    expect(calls.map((call) => call.headers['x-vercel-protection-bypass'])).toEqual([
      'secret-value',
      'secret-value',
    ])
  })
})
