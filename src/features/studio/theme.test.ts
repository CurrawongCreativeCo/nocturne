import { describe, expect, it } from 'vitest'

import { currawongBrand, currawongClassicBrand } from '@/config/studio-brand/currawong'
import { resolveStudioBrand } from '@/config/studio-brand/resolve'
import { contrastRatio } from '@/lib/color/contrast'

import { brandPreviewCases } from './brand-preview/cases'
import { buildStudioTheme } from './theme'

describe('Studio UI 4 theme', () => {
  for (const { id, brand } of brandPreviewCases) {
    const theme = buildStudioTheme(brand)
    for (const scheme of ['light', 'dark'] as const) {
      const roles = brand[scheme]
      if (!theme.v2) throw new Error('Missing v2 theme')
      const card = theme.v2.color[scheme].default
      it(`${id} ${scheme} preserves the page, surface, text, border, focus and primary roles`, () => {
        expect(card.bg).toBe(roles.background)
        expect(card.fg).toBe(roles.text)
        expect(card.border).toBe(roles.surfaceBorder)
        expect(card.focusRing).toBe(roles.focus)
        expect(card.input.default.enabled.bg).toBe(roles.surface)
        expect(card.button.default.primary.enabled.bg).toBe(roles.accentFill)
        expect(card.button.default.primary.enabled.fg).toBe(roles.onAccent)
        expect(card.accent.fg).toBe(roles.accentText)
      })
      it(`${id} ${scheme} keeps every badge label readable on each card tone`, () => {
        for (const [cardTone, themedCard] of Object.entries(theme.v2?.color[scheme] ?? {})) {
          for (const [badgeTone, badge] of Object.entries(themedCard.badge)) {
            expect(
              contrastRatio(badge.fg, badge.bg),
              `${cardTone} card, ${badgeTone} badge: ${badge.fg} on ${badge.bg}`,
            ).toBeGreaterThanOrEqual(4.5)
          }
        }
      })
      it(`${id} ${scheme} keeps labels and focus readable on controls and selected states`, () => {
        expect(contrastRatio(card.focusRing, card.bg)).toBeGreaterThanOrEqual(3)
        expect(contrastRatio(card.muted.fg, card.bg)).toBeGreaterThanOrEqual(4.5)
        for (const tone of ['default', 'neutral', 'primary'] as const) {
          for (const name of ['enabled', 'hovered', 'pressed', 'selected'] as const) {
            for (const state of [
              ...Object.values(card.button).map((mode) => mode[tone][name]),
              card.selectable[tone][name],
            ]) {
              expect(contrastRatio(state.fg, state.bg)).toBeGreaterThanOrEqual(4.5)
              expect(contrastRatio(state.muted.fg, state.bg)).toBeGreaterThanOrEqual(4.5)
            }
          }
        }
        for (const input of Object.values(card.input.default)) {
          expect(contrastRatio(input.fg, input.bg)).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(input.placeholder, input.bg)).toBeGreaterThanOrEqual(4.5)
        }
      })
    }
    it(`${id} retains both schemes, radius defaults and no Appearance-lock markers`, () => {
      expect(theme.v2?.color).toHaveProperty('light')
      expect(theme.v2?.color).toHaveProperty('dark')
      expect(theme).not.toHaveProperty('__legacy')
      expect(theme).not.toHaveProperty('__dark')
      expect(theme).not.toHaveProperty('__themer')
      expect(theme.v2?.radius).toEqual([0, 1, 3, 6, 9, 12, 21])
    })
  }

  it('uses Newsreader only for headings, and Inter for interface text and inputs', () => {
    const theme = buildStudioTheme(currawongBrand, {
      interface: 'Self-hosted Inter',
      heading: 'Self-hosted Newsreader',
    })
    expect(theme.v2?.font.heading.family).toBe('Self-hosted Newsreader')
    expect(theme.v2?.font.text.family).toBe('Self-hosted Inter')
    expect(theme.v2?.font.label.family).toBe('Self-hosted Inter')
    expect(theme.v2?.font.code.family).not.toContain('Newsreader')
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Studio still reads this for document headers
    expect(theme.fonts).toBe(theme.v2?.font)
  })

  it('keeps client palettes independent of the selected Currawong default', () => {
    const file = { colors: { primary: '#2f5d3a', secondary: '#f3ebdd' } }
    const premium = resolveStudioBrand(file, currawongBrand)
    const classic = resolveStudioBrand(file, currawongClassicBrand)
    for (const scheme of ['light', 'dark'] as const)
      expect(premium[scheme]).toEqual(classic[scheme])
  })

  it('creates independent themes, so previews cannot mutate other brands', () => {
    const before = buildStudioTheme(currawongBrand)
    const snapshot = JSON.stringify(before.v2)
    buildStudioTheme(currawongClassicBrand)
    expect(JSON.stringify(before.v2)).toBe(snapshot)
  })
})
