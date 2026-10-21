import type { StudioBrandDefaults } from './types.ts'

/** Currawong's brand palette. */
export const currawongPalette = {
  ink: '#101013',
  paper: '#f4efe6',
  violet: '#5f2bd4',
  amber: '#eca72a',
  lilac: '#e9deef',
} as const

/**
 * Currawong Creative's classic CMS brand: used by a site's Studio unless studio-brand.json sets
 * something. The role colours are fixed, not computed, and `currawong.test.ts` checks every pair
 * against its contrast threshold. The rules behind the choices:
 * - Violet is for light backgrounds only. On ink it is 2.5:1, so dark mode uses the lighter #9f80e5.
 * - Amber is a fill (with ink text on it) or text on ink. As text on paper it fails, so light mode
 *   uses the darker #7e5c1f.
 * - Lilac is only ever a surface, and always with a border: against paper it is just 1.1:1.
 */
export const currawongClassicBrand: StudioBrandDefaults = {
  name: 'Currawong Creative',
  logo: {
    light: { kind: 'image', src: 'src/assets/brand/currawong/wordmark-on-light.webp' },
    dark: { kind: 'image', src: 'src/assets/brand/currawong/wordmark-on-dark.webp' },
  },
  mark: {
    light: { kind: 'image', src: 'src/assets/brand/currawong/mark-no-text.webp' },
    dark: { kind: 'image', src: 'src/assets/brand/currawong/mark-no-text-on-dark.webp' },
  },
  light: {
    background: currawongPalette.paper,
    text: currawongPalette.ink,
    surface: currawongPalette.lilac,
    surfaceBorder: '#7a6c8c', // 4.2:1 on paper, 3.7:1 on lilac
    accentFill: currawongPalette.violet,
    onAccent: '#ffffff', // 7.5:1 on violet
    accentText: currawongPalette.violet, // 6.6:1 on paper
    focus: currawongPalette.violet,
    highlightFill: currawongPalette.amber,
    onHighlight: currawongPalette.ink, // 9.2:1 on amber
    highlightText: '#7e5c1f', // amber as text on paper: 5.3:1
  },
  dark: {
    background: currawongPalette.ink,
    text: currawongPalette.paper,
    surface: '#1d1830', // ink tinted toward violet
    surfaceBorder: '#7a6fa0', // 4.2:1 on ink, 3.8:1 on the surface
    accentFill: '#9f80e5', // 6.1:1 on ink; plain violet is 2.5:1
    onAccent: currawongPalette.ink,
    accentText: '#9f80e5',
    focus: '#9f80e5',
    highlightFill: currawongPalette.amber,
    onHighlight: currawongPalette.ink,
    highlightText: currawongPalette.amber, // 9.2:1 on ink
  },
}

/** Approved proposal §5, with borders strengthened to meet the existing 3:1 boundary rules. */
export const currawongBrand: StudioBrandDefaults = {
  ...currawongClassicBrand,
  light: {
    ...currawongClassicBrand.light,
    background: '#f7f4fa',
    text: '#1f1a29',
    surface: '#fffeff',
    surfaceBorder: '#8a7c9b',
    accentFill: '#6d47c8',
    onAccent: '#ffffff',
    accentText: '#6d47c8',
    focus: '#7651dc',
  },
  dark: {
    ...currawongClassicBrand.dark,
    background: '#17151f',
    text: '#f6f3fa',
    surface: '#25212f',
    surfaceBorder: '#8b7999',
    accentFill: '#c4a9f6',
    onAccent: '#211e2b',
    accentText: '#c4a9f6',
    focus: '#d2b6ff',
  },
}
