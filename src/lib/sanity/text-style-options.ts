import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import {
  INLINE_CASES,
  INLINE_SIZES,
  INLINE_WEIGHTS,
  type InlineCase,
  type InlineSize,
  type InlineWeight,
} from './inline-list-options'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * The look of one text element of a card (README, "Link list": Card design and overrides): a link's
 * eyebrow, label or description, and later other cards' (build plan). Sizes are steps on the site's
 * type scale, relative to what the layout draws, so Medium is always the layout's own size and a
 * layout keeps its proportions; the other choices are the same words the Service categories use.
 * Every property is optional and layered like a surface (design-overrides.ts). Kept free of Studio
 * code so the site can import it.
 */

export const TEXT_SIZES = INLINE_SIZES
export type TextSize = InlineSize
export const TEXT_WEIGHTS = INLINE_WEIGHTS
export type TextWeight = InlineWeight
export const TEXT_CASES = INLINE_CASES
export type TextCase = InlineCase

export const TEXT_TRACKINGS = ['normal', 'wide', 'wider'] as const
export type TextTracking = (typeof TEXT_TRACKINGS)[number]
export const TEXT_TRACKING_TITLES: Record<TextTracking, string> = {
  normal: 'Normal',
  wide: 'Wide',
  wider: 'Wider',
}

export const TEXT_LEADINGS = ['tight', 'normal', 'relaxed'] as const
export type TextLeading = (typeof TEXT_LEADINGS)[number]
export const TEXT_LEADING_TITLES: Record<TextLeading, string> = {
  tight: 'Tight',
  normal: 'Normal',
  relaxed: 'Relaxed',
}

/** The colours a card's text offers (Inherit and Custom too). */
export const TEXT_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const
const OFFERED: readonly ThemeColour[] = ['inherit', ...TEXT_COLOUR_CHOICES, 'custom']

/** The site's type scale, smallest first (tokens.json `typography`, plus Tailwind's text-xs below it). */
export const TYPE_SCALE = [
  'text-xs',
  'text-small',
  'text-body',
  'text-lead',
  'text-h4',
  'text-h3',
  'text-h2',
  'text-h1',
  'text-display',
] as const
export type TypeStep = (typeof TYPE_SCALE)[number]

const STEP: Record<TextSize, number> = { small: -1, medium: 0, large: 1 }
const WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
}
const TRACKING_CLASS: Record<TextTracking, string> = {
  normal: 'tracking-normal',
  wide: 'tracking-[0.08em]',
  wider: 'tracking-[0.16em]',
}
const LEADING_CLASS: Record<TextLeading, string> = {
  tight: 'leading-snug',
  normal: '',
  relaxed: 'leading-relaxed',
}

/** The stored fields, as a query returns them. */
export interface TextStyleInput {
  size?: string | null
  weight?: string | null
  colour?: ThemeColourInput | null
  textCase?: string | null
  tracking?: string | null
  leading?: string | null
}

/** A resolved text layer: a property is present only when it was chosen. */
export interface TextStyle {
  size?: TextSize
  weight?: TextWeight
  colour?: string
  textCase?: TextCase
  tracking?: TextTracking
  leading?: TextLeading
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/** Only the chosen properties, so the result can be layered (`layerDesign`). */
export function resolveTextStyle(input: TextStyleInput | null | undefined): TextStyle {
  const style: TextStyle = {}
  const size = pick(TEXT_SIZES, input?.size)
  if (size !== undefined) style.size = size
  const weight = pick(TEXT_WEIGHTS, input?.weight)
  if (weight !== undefined) style.weight = weight
  const colour = themeColourCss(input?.colour, OFFERED)
  if (colour !== undefined) style.colour = colour
  const textCase = pick(TEXT_CASES, input?.textCase)
  if (textCase !== undefined) style.textCase = textCase
  const tracking = pick(TEXT_TRACKINGS, input?.tracking)
  if (tracking !== undefined) style.tracking = tracking
  const leading = pick(TEXT_LEADINGS, input?.leading)
  if (leading !== undefined) style.leading = leading
  return style
}

/** What a layout draws for one text element with nothing chosen. */
export interface OwnText {
  /** The step Medium is. */
  size: TypeStep
  /** The size used while none is chosen; Medium unless the element starts smaller (an eyebrow). */
  defaultSize?: TextSize
  weight: TextWeight
  /** The colour classes used while no colour is chosen (e.g. `text-ink-muted`, `opacity-80`). */
  colour?: string
  textCase?: TextCase
}

/** `size` moved `step` steps along the type scale, kept on it. */
export function stepType(size: TypeStep, step: number): TypeStep {
  const index = TYPE_SCALE.indexOf(size) + step
  return TYPE_SCALE[Math.min(TYPE_SCALE.length - 1, Math.max(0, index))] ?? size
}

/**
 * The classes and style of a text element. Capitals are spaced a little unless a spacing is chosen,
 * as small capitals usually are; as typed, the spacing is the font's own.
 */
export function textLook(
  style: TextStyle,
  own: OwnText,
): { className: string; style?: CSSProperties } {
  const size = stepType(own.size, STEP[style.size ?? own.defaultSize ?? 'medium'])
  const textCase = style.textCase ?? own.textCase ?? 'normal'
  const tracking = style.tracking ?? (textCase === 'uppercase' ? 'wide' : undefined)
  const classes = [
    size,
    WEIGHT_CLASS[style.weight ?? own.weight],
    textCase === 'uppercase' ? 'uppercase' : '',
    tracking ? TRACKING_CLASS[tracking] : '',
    style.leading ? LEADING_CLASS[style.leading] : '',
    style.colour === undefined ? (own.colour ?? '') : '',
  ]
  return {
    className: classes.filter(Boolean).join(' '),
    style: style.colour === undefined ? undefined : { color: style.colour },
  }
}
