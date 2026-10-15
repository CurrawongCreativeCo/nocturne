import { describe, expect, it } from 'vitest'

import { backgroundParam, browserIconLinks, browserIconUrl, paddingPixels } from './browser-icon'

const config = { projectId: 'abc123xy', dataset: 'production' }
const asset = { asset: { _ref: 'image-0123456789abcdef0123456789abcdef01234567-1024x1024-png' } }
const params = (url: string) => new URL(url).searchParams

describe('browserIconUrl', () => {
  it('serves a PNG from the Sanity CDN at the requested size', () => {
    const url = browserIconUrl(asset, 32, {}, config)
    expect(url.startsWith('https://cdn.sanity.io/images/abc123xy/production/')).toBe(true)
    expect(params(url).get('fm')).toBe('png')
    expect(params(url).get('w')).toBe('32')
    expect(params(url).get('h')).toBe('32')
    expect(params(url).get('fit')).toBe('fill')
    expect(params(url).has('pad')).toBe(false)
    expect(params(url).has('bg')).toBe(false)
  })

  it('keeps the finished size when padding is added', () => {
    const url = browserIconUrl(asset, 512, { padding: 'medium' }, config)
    const pad = Number(params(url).get('pad'))
    expect(pad).toBe(82)
    expect(Number(params(url).get('w')) + pad * 2).toBe(512)
    expect(Number(params(url).get('h')) + pad * 2).toBe(512)
  })

  it('pads small more gently than medium, and none not at all', () => {
    expect(paddingPixels(512, 'none')).toBe(0)
    expect(paddingPixels(512, 'small')).toBe(41)
    expect(paddingPixels(512, 'medium')).toBe(82)
    expect(paddingPixels(512, null)).toBe(0)
  })

  it('fills the background with a hex colour, without the #', () => {
    for (const background of ['light', 'dark', 'brand'] as const) {
      const bg = params(browserIconUrl(asset, 180, { background }, config)).get('bg')
      expect(bg).toMatch(/^[0-9a-f]{6}$/i)
    }
    expect(backgroundParam('transparent')).toBeUndefined()
    expect(backgroundParam(undefined)).toBeUndefined()
    expect(backgroundParam('light')).not.toBe(backgroundParam('dark'))
  })

  it('applies the editor crop as a rect on the source image', () => {
    const cropped = { ...asset, crop: { left: 0.1, right: 0.1, top: 0.1, bottom: 0.1 } }
    expect(params(browserIconUrl(cropped, 32, {}, config)).get('rect')).toBe('102,102,820,820')
  })

  it('works for SVG assets, which the CDN rasterises to PNG', () => {
    const svg = { asset: { _ref: 'image-0123456789abcdef0123456789abcdef01234567-512x512-svg' } }
    const url = browserIconUrl(svg, 192, {}, config)
    expect(new URL(url).pathname.endsWith('-512x512.svg')).toBe(true)
    expect(params(url).get('fm')).toBe('png')
  })
})

describe('browserIconLinks', () => {
  const links = browserIconLinks(asset, { padding: 'small', background: 'light' }, config)

  it('gives 32, 192 and 512 px icons and a 180 px Apple icon', () => {
    expect(links.icon.map((icon) => icon.sizes)).toEqual(['32x32', '192x192', '512x512'])
    expect(links.apple.map((icon) => icon.sizes)).toEqual(['180x180'])
  })

  it('points every icon at the CDN as image/png', () => {
    for (const icon of [...links.icon, ...links.apple]) {
      expect(icon.url.startsWith('https://cdn.sanity.io/')).toBe(true)
      expect(icon.type).toBe('image/png')
    }
  })
})
