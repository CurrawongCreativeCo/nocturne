import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
  checkCanonicals,
  checkIndexable,
  checkOgImages,
  checkRobots,
  checkSingleH1,
  checkSitemapEntries,
  checkSitemapStatuses,
  checkUniqueMetadata,
  collectOgImages,
  isNonProductionHost,
  loadSitemapUrls,
  parseRobots,
  parseSitemapXml,
} from './seo.mjs'

const read = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const good = read('home-good.html')
const leftovers = read('home-leftovers.html')
const origin = 'https://bondiplumbing.com.au'
const page = (path, html) => ({ url: `${origin}${path}`, html })
const withHead = (head, body = '<h1>Hi</h1>') =>
  `<html><head>${head}</head><body>${body}</body></html>`

describe('isNonProductionHost', () => {
  it('flags local and preview hosts', () => {
    for (const host of ['localhost', '127.0.0.1', 'site.vercel.app', 'a.localhost', 'mac.local']) {
      expect(isNonProductionHost(host), host).toBe(true)
    }
    expect(isNonProductionHost('bondiplumbing.com.au')).toBe(false)
  })
})

describe('checkCanonicals', () => {
  it('passes canonicals on the production origin', () => {
    expect(checkCanonicals({ pages: [page('/', good)], origin })[0].status).toBe('pass')
  })
  it('fails localhost, vercel.app and other-origin canonicals', () => {
    const [local] = checkCanonicals({ pages: [page('/', leftovers)], origin })
    expect(local.status).toBe('fail')
    expect(local.detail).toContain('http://localhost:3000')
    expect(local.fix).toContain('NEXT_PUBLIC_SITE_URL')
    const vercel = withHead('<link rel="canonical" href="https://x-git-main.vercel.app/about">')
    expect(checkCanonicals({ pages: [page('/about', vercel)], origin })[0].status).toBe('fail')
    const www = withHead('<link rel="canonical" href="https://www.bondiplumbing.com.au/">')
    expect(checkCanonicals({ pages: [page('/', www)], origin })[0].status).toBe('fail')
  })
  it('warns when a canonical is missing and fails a relative one', () => {
    expect(checkCanonicals({ pages: [page('/', withHead(''))], origin })[0].status).toBe('warn')
    const relative = withHead('<link rel="canonical" href="/about">')
    expect(checkCanonicals({ pages: [page('/about', relative)], origin })[0].status).toBe('fail')
  })
})

describe('robots.txt', () => {
  it('parses groups and sitemaps', () => {
    const { groups, sitemaps } = parseRobots(read('robots-good.txt'))
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ agents: ['*'], allow: ['/'], disallow: ['/studio', '/api/'] })
    expect(sitemaps).toEqual([`${origin}/sitemap.xml`])
  })
  it('passes a crawlable robots.txt that lists the sitemap', () => {
    const results = checkRobots({ status: 200, text: read('robots-good.txt'), origin })
    expect(results.map((r) => r.status)).toEqual(['pass', 'pass'])
  })
  it('fails a site-wide Disallow and a missing Sitemap line', () => {
    const results = checkRobots({ status: 200, text: read('robots-blocked.txt'), origin })
    expect(results.map((r) => r.status)).toEqual(['fail', 'fail'])
    expect(results[0].detail).toContain('Disallow: /')
  })
  it('fails a sitemap on another origin and a missing file', () => {
    const text = 'User-agent: *\nAllow: /\nSitemap: http://localhost:3000/sitemap.xml'
    expect(checkRobots({ status: 200, text, origin })[1].status).toBe('fail')
    expect(checkRobots({ status: 404, text: '', origin })[0].status).toBe('fail')
  })
  it("does not treat other crawlers' Disallow as blocking everyone", () => {
    const text =
      'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\nSitemap: https://bondiplumbing.com.au/s.xml'
    expect(checkRobots({ status: 200, text, origin })[0].status).toBe('pass')
  })
})

describe('sitemaps', () => {
  it('parses a urlset and decodes entities', () => {
    const { type, locs } = parseSitemapXml(read('sitemap-urlset.xml'))
    expect(type).toBe('urlset')
    expect(locs).toContain(`${origin}/services?type=a&page=2`)
    expect(locs).toHaveLength(4)
  })
  it('parses a sitemap index', () => {
    const { type, locs } = parseSitemapXml(read('sitemap-index.xml'))
    expect(type).toBe('index')
    expect(locs).toHaveLength(2)
  })
  it('follows an index, dedupes and caps', async () => {
    const files = {
      [`${origin}/sitemap.xml`]: read('sitemap-index.xml'),
      [`${origin}/sitemap/0.xml`]: read('sitemap-urlset.xml'),
      [`${origin}/sitemap/1.xml`]: `<urlset><url><loc>${origin}/blog</loc></url></urlset>`,
    }
    const get = vi.fn((url) =>
      Promise.resolve(url in files ? { status: 200, text: files[url] } : { status: 404, text: '' }),
    )
    const all = await loadSitemapUrls({ sitemapUrls: [`${origin}/sitemap.xml`], get })
    expect(all.urls).toHaveLength(4)
    expect(all.total).toBe(4)
    expect(all.capped).toBe(false)
    const capped = await loadSitemapUrls({ sitemapUrls: [`${origin}/sitemap.xml`], get, cap: 2 })
    expect(capped.urls).toHaveLength(2)
    expect(capped.capped).toBe(true)
    const broken = await loadSitemapUrls({ sitemapUrls: [`${origin}/missing.xml`], get })
    expect(broken.problems[0]).toContain('HTTP 404')
  })

  it('judges the sitemap entries', () => {
    const base = { total: 2, capped: false, problems: [], origin }
    expect(checkSitemapEntries({ ...base, urls: [`${origin}/`, `${origin}/a`] })[0].status).toBe(
      'pass',
    )
    expect(checkSitemapEntries({ ...base, urls: [] })[0].status).toBe('fail')
    expect(checkSitemapEntries({ ...base, urls: ['http://localhost:3000/'] })[0].status).toBe(
      'fail',
    )
    expect(
      checkSitemapEntries({ ...base, urls: [`${origin}/`], capped: true, total: 300 })[0].detail,
    ).toContain('first 1 of 300')
    expect(checkSitemapEntries({ ...base, urls: [], problems: ['x (HTTP 500)'] })[0].status).toBe(
      'fail',
    )
  })

  it('requires every sitemap URL to return 200', () => {
    const ok = { url: `${origin}/`, status: 200 }
    expect(checkSitemapStatuses({ statuses: [ok] })[0].status).toBe('pass')
    const [result] = checkSitemapStatuses({
      statuses: [
        ok,
        { url: `${origin}/old`, status: 301, redirectedTo: '/new' },
        { url: `${origin}/gone`, status: 404 },
        { url: `${origin}/down`, status: 0, error: 'timeout' },
      ],
    })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('3 of 4 failed')
    expect(result.detail).toContain('/old (301 → /new)')
    expect(result.detail).toContain('/down (timeout)')
  })
})

describe('checkUniqueMetadata', () => {
  const doc = (title, description) =>
    withHead(
      `<title>${title}</title>${description ? `<meta name="description" content="${description}">` : ''}`,
    )
  it('passes distinct titles and descriptions', () => {
    const results = checkUniqueMetadata({
      pages: [page('/', doc('Home', 'The home page')), page('/a', doc('About', 'About us'))],
    })
    expect(results.map((r) => r.status)).toEqual(['pass', 'pass'])
  })
  it('fails duplicate titles and descriptions, ignoring case', () => {
    const results = checkUniqueMetadata({
      pages: [page('/', doc('Home', 'Same words')), page('/a', doc('home', 'same words'))],
    })
    expect(results.map((r) => r.status)).toEqual(['fail', 'fail'])
    expect(results[0].detail).toContain('/ and /a'.replace(' and ', ', '))
  })
  it('fails a missing title and only warns about a missing description', () => {
    const results = checkUniqueMetadata({ pages: [page('/', withHead('')), page('/a', doc('A'))] })
    expect(results.map((r) => r.status)).toEqual(['fail', 'warn'])
  })
})

describe('checkSingleH1', () => {
  it('passes exactly one and fails zero or many', () => {
    expect(checkSingleH1({ pages: [page('/', good)] })[0].status).toBe('pass')
    const [result] = checkSingleH1({
      pages: [page('/', good), page('/two', leftovers), page('/none', withHead('', '<p>x</p>'))],
    })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('/two has 2')
    expect(result.detail).toContain('/none has 0')
  })
})

describe('checkIndexable', () => {
  it('fails a noindex home page and warns about other noindex pages', () => {
    const hidden = withHead('<meta name="robots" content="noindex">')
    expect(checkIndexable({ pages: [page('/', good)], homeUrl: `${origin}/` })[0].status).toBe(
      'pass',
    )
    expect(checkIndexable({ pages: [page('/', hidden)], homeUrl: `${origin}/` })[0].status).toBe(
      'fail',
    )
    expect(
      checkIndexable({
        pages: [page('/', good), page('/thanks', hidden)],
        homeUrl: `${origin}/`,
      })[0].status,
    ).toBe('warn')
  })
  it('honours the X-Robots-Tag header', () => {
    const url = `${origin}/`
    const [result] = checkIndexable({
      pages: [{ url, html: good }],
      homeUrl: url,
      headerValues: { [url]: 'noindex' },
    })
    expect(result.status).toBe('fail')
  })
})

describe('og:image', () => {
  it('collects absolute image URLs once and lists pages without one', () => {
    const { images, missing } = collectOgImages([
      page('/', good),
      page('/b', good),
      page('/c', withHead('<meta property="og:image" content="/share.png">')),
      page('/d', withHead('')),
    ])
    expect([...images.keys()]).toEqual([`${origin}/api/og?title=Home`, `${origin}/share.png`])
    expect(images.get(`${origin}/api/og?title=Home`)).toHaveLength(2)
    expect(missing).toEqual([`${origin}/d`])
  })
  it('passes real images and fails non-images, errors and 404s', () => {
    const image = { url: 'https://x/og', status: 200, contentType: 'image/png' }
    expect(checkOgImages({ fetched: [image], missing: [], total: 1 })[0].status).toBe('pass')
    expect(
      checkOgImages({ fetched: [{ ...image, contentType: 'text/html' }], missing: [], total: 1 })[0]
        .status,
    ).toBe('fail')
    expect(
      checkOgImages({ fetched: [{ ...image, status: 404 }], missing: [], total: 1 })[0].status,
    ).toBe('fail')
    expect(
      checkOgImages({
        fetched: [{ url: 'x', status: 0, error: 'refused' }],
        missing: [],
        total: 1,
      })[0].detail,
    ).toContain('refused')
  })
  it('fails when no page has one and warns when only some lack one', () => {
    expect(checkOgImages({ fetched: [], missing: ['a'], total: 1 })[0].status).toBe('fail')
    const image = { url: 'https://x/og', status: 200, contentType: 'image/webp' }
    expect(checkOgImages({ fetched: [image], missing: [`${origin}/d`], total: 2 })[0].status).toBe(
      'warn',
    )
  })
})
