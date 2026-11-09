/**
 * Vetted display and body font pairings (build plan task 216). Data only: nothing here loads a font.
 * The site's fonts are the ones in `src/app/layout.tsx` and `src/styles/tokens.json`; to apply a
 * pairing for a client, import the two families from `next/font/google` under the names below and
 * point the `font` tokens at their variables (README, "Brand colours and design"; build plan task 13).
 * The README table, task 13 and the design manifest (task 215) read this list, so design-reference and
 * AI font selection can use it later.
 *
 * Every family is on Google Fonts, so `next/font/google` self-hosts it at build time and visitors make
 * no request to Google. `font-pairings.test.ts` checks each family and weight against next/font's own
 * font list.
 */

export const FONT_MOODS = [
  'editorial',
  'modern',
  'classic',
  'friendly',
  'refined',
  'technical',
] as const
export type FontMood = (typeof FONT_MOODS)[number]

export interface PairedFont {
  /** The family as Google Fonts names it. */
  readonly family: string
  /** The `next/font/google` export to import (the family with underscores). */
  readonly nextFont: string
  /** The weights to load for this role. */
  readonly weights: readonly string[]
}

export interface FontPairing {
  readonly id: string
  readonly title: string
  readonly display: PairedFont
  readonly body: PairedFont
  readonly moods: readonly FontMood[]
  /** One line on when it suits. */
  readonly suits: string
}

const font = (family: string, weights: readonly string[]): PairedFont => ({
  family,
  nextFont: family.replaceAll(' ', '_'),
  weights,
})

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'inter',
    title: 'Inter throughout',
    display: font('Inter', ['500', '600', '700']),
    body: font('Inter', ['400', '500', '600']),
    moods: ['modern'],
    suits: 'The site’s current font: clean, neutral and legible at every size.',
  },
  {
    id: 'playfair-inter',
    title: 'Playfair Display with Inter',
    display: font('Playfair Display', ['500', '600', '700']),
    body: font('Inter', ['400', '500', '600']),
    moods: ['editorial', 'refined'],
    suits: 'Magazine-style headings over a plain body: hospitality, culture and boutique services.',
  },
  {
    id: 'dm-serif-dm-sans',
    title: 'DM Serif Display with DM Sans',
    display: font('DM Serif Display', ['400']),
    body: font('DM Sans', ['400', '500', '700']),
    moods: ['editorial', 'friendly'],
    suits: 'A confident serif with a warm, geometric body: practices, studios and food.',
  },
  {
    id: 'fraunces-inter',
    title: 'Fraunces with Inter',
    display: font('Fraunces', ['500', '600', '700']),
    body: font('Inter', ['400', '500', '600']),
    moods: ['friendly', 'editorial'],
    suits: 'A soft, characterful serif: family businesses, makers and education.',
  },
  {
    id: 'lora-source-sans',
    title: 'Lora with Source Sans 3',
    display: font('Lora', ['500', '600', '700']),
    body: font('Source Sans 3', ['400', '600']),
    moods: ['classic', 'friendly'],
    suits: 'A readable book serif over a humanist sans: advice, health and community.',
  },
  {
    id: 'baskerville-work-sans',
    title: 'Libre Baskerville with Work Sans',
    display: font('Libre Baskerville', ['400', '700']),
    body: font('Work Sans', ['400', '500', '600']),
    moods: ['classic', 'refined'],
    suits: 'A traditional, trustworthy serif: law, finance and heritage brands.',
  },
  {
    id: 'space-grotesk-inter',
    title: 'Space Grotesk with Inter',
    display: font('Space Grotesk', ['500', '600', '700']),
    body: font('Inter', ['400', '500', '600']),
    moods: ['modern', 'technical'],
    suits: 'A distinctive grotesque: software, engineering and design-led services.',
  },
  {
    id: 'jakarta-manrope',
    title: 'Plus Jakarta Sans with Manrope',
    display: font('Plus Jakarta Sans', ['600', '700', '800']),
    body: font('Manrope', ['400', '500', '600']),
    moods: ['modern', 'friendly'],
    suits: 'Rounded, contemporary sans on both: wellness, retail and local services.',
  },
]
