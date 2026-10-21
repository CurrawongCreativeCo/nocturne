import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/color/contrast'

import {
  currawongBrand as premiumBrand,
  currawongClassicBrand as currawongBrand,
  currawongPalette,
} from './currawong'
import { CONTRAST_RULES, ROLE_NAMES } from './types'

describe('Currawong classic CMS brand', () => {
  for (const scheme of ['light', 'dark'] as const) {
    describe(`${scheme} mode`, () => {
      const roles = currawongBrand[scheme]

      it('defines every role as a lowercase hex', () => {
        for (const role of ROLE_NAMES) expect(roles[role]).toMatch(/^#[0-9a-f]{6}$/)
      })

      for (const rule of CONTRAST_RULES) {
        it(`${rule.foreground} on ${rule.background} reaches ${rule.min}:1 (${rule.use})`, () => {
          expect(
            contrastRatio(roles[rule.foreground], roles[rule.background]),
          ).toBeGreaterThanOrEqual(rule.min)
        })
      }
    })
  }

  it('matches the approved role choices', () => {
    const { light, dark } = currawongBrand
    expect(light).toMatchObject({
      background: currawongPalette.paper,
      text: currawongPalette.ink,
      accentText: currawongPalette.violet,
      surface: currawongPalette.lilac,
      highlightFill: currawongPalette.amber,
      onHighlight: currawongPalette.ink,
      highlightText: '#7e5c1f',
    })
    expect(dark).toMatchObject({
      background: currawongPalette.ink,
      text: currawongPalette.paper,
      accentFill: '#9f80e5',
      onAccent: currawongPalette.ink,
      highlightText: currawongPalette.amber,
    })
  })

  it('never puts violet text or focus on ink, or amber text on paper', () => {
    const { light, dark } = currawongBrand
    expect([dark.accentText, dark.focus, dark.accentFill]).not.toContain(currawongPalette.violet)
    expect(light.highlightText).not.toBe(currawongPalette.amber)
    expect(contrastRatio(currawongPalette.violet, currawongPalette.ink)).toBeLessThan(3)
  })

  it('gives the lilac surface a border that can be seen on both the surface and the page', () => {
    expect(contrastRatio(currawongPalette.paper, currawongPalette.lilac)).toBeLessThan(1.2)
    expect(
      contrastRatio(currawongBrand.light.surfaceBorder, currawongPalette.paper),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrastRatio(currawongBrand.light.surfaceBorder, currawongPalette.lilac),
    ).toBeGreaterThanOrEqual(3)
  })

  it('points its logos at src/assets/brand/currawong/', () => {
    for (const asset of [
      currawongBrand.logo.light,
      currawongBrand.logo.dark,
      currawongBrand.mark.light,
      currawongBrand.mark.dark,
    ]) {
      expect(asset.kind).toBe('image')
      expect(asset.kind === 'image' && asset.src).toMatch(/^src\/assets\/brand\/currawong\//)
    }
  })
})

describe('Currawong premium CMS brand', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const roles = premiumBrand[scheme]
    it(`${scheme} defines every role as a lowercase hex`, () => {
      for (const role of ROLE_NAMES) expect(roles[role]).toMatch(/^#[0-9a-f]{6}$/)
    })
    for (const rule of CONTRAST_RULES) {
      it(`${scheme}: ${rule.foreground} on ${rule.background} reaches ${rule.min}:1`, () => {
        expect(
          contrastRatio(roles[rule.foreground], roles[rule.background]),
        ).toBeGreaterThanOrEqual(rule.min)
      })
    }
    it(`${scheme} retains the classic highlight roles`, () => {
      for (const role of ['highlightFill', 'onHighlight', 'highlightText'] as const) {
        expect(roles[role]).toBe(currawongBrand[scheme][role])
      }
    })
  }
  it('uses the approved proposal roles', () => {
    expect(premiumBrand.light).toMatchObject({
      background: '#f7f4fa',
      text: '#1f1a29',
      surface: '#fffeff',
      accentFill: '#6d47c8',
      focus: '#7651dc',
    })
    expect(premiumBrand.dark).toMatchObject({
      background: '#17151f',
      text: '#f6f3fa',
      surface: '#25212f',
      accentFill: '#c4a9f6',
      focus: '#d2b6ff',
    })
  })
})
