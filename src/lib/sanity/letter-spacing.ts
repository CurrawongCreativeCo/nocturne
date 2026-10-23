import { stegaClean } from 'next-sanity'

export const LETTER_SPACINGS = ['normal', 'wide', 'extra-wide'] as const
export type LetterSpacing = (typeof LETTER_SPACINGS)[number]
export const LETTER_SPACING_TITLES: Record<LetterSpacing, string> = {
  normal: 'Normal',
  wide: 'Wide',
  'extra-wide': 'Extra wide',
}
export const LETTER_SPACING_CLASSES: Record<LetterSpacing, string> = {
  normal: 'tracking-normal',
  wide: 'tracking-[0.1em]',
  'extra-wide': 'tracking-[0.2em]',
}

/** Unset keeps each component's existing typography. */
export const letterSpacingOf = (value: string | null | undefined): LetterSpacing | undefined =>
  LETTER_SPACINGS.find((option) => option === stegaClean(value))
