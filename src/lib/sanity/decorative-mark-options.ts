import { stegaClean } from 'next-sanity'

import { BADGE_ICONS } from './badge-icons'
import { frameMaskUrl } from './frame-mask'
import { isCdnUrl } from './image-design-options'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * A decorative mark (task 156; README, "Decorative marks"): a faint word, picture or icon behind a
 * section, card or item. One field shape at every scope (lib/sanity/schema/decorative-mark.ts) and one
 * renderer (components/ui/decorative-mark.tsx). Every bound lives here and is applied again when drawing,
 * so a value stored outside them, or by an older Studio, can't draw outside them. Site-safe.
 */

export const MARK_KINDS = ['none', 'text', 'picture', 'icon'] as const
export type MarkKind = (typeof MARK_KINDS)[number]
export const MARK_KIND_TITLES: Record<MarkKind, string> = {
  none: 'None',
  text: 'Words',
  picture: 'Picture',
  icon: 'Icon',
}

export const MARK_SIZES = ['small', 'medium', 'large'] as const
export type MarkSize = (typeof MARK_SIZES)[number]
export const MARK_SIZE_TITLES: Record<MarkSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

/** Container width each size takes: a picture or icon's width, words' font size. */
export const MARK_SIZE_CQI: Record<MarkSize, { box: number; text: number }> = {
  small: { box: 20, text: 8 },
  medium: { box: 40, text: 14 },
  large: { box: 70, text: 22 },
}

export const MARK_PHONE_SCALES = ['same', 'smaller', 'hidden'] as const
export type MarkPhoneScale = (typeof MARK_PHONE_SCALES)[number]
export const MARK_PHONE_SCALE_TITLES: Record<MarkPhoneScale, string> = {
  same: 'Same',
  smaller: 'Smaller',
  hidden: 'Hidden',
}

const VERTICALS = ['top', 'middle', 'bottom'] as const
const HORIZONTALS = ['left', 'centre', 'right'] as const
type Vertical = (typeof VERTICALS)[number]
type Horizontal = (typeof HORIZONTALS)[number]
export type MarkAnchor = `${Vertical}-${Horizontal}`
export const MARK_ANCHORS = VERTICALS.flatMap((y) =>
  HORIZONTALS.map((x): MarkAnchor => `${y}-${x}`),
)
export const markAnchorTitle = (anchor: MarkAnchor) => {
  const [y = '', x = ''] = anchor.split('-')
  return `${y.charAt(0).toUpperCase()}${y.slice(1)} ${x}`
}
const AXIS: Record<Vertical | Horizontal, number> = {
  top: 0,
  middle: 50,
  bottom: 100,
  left: 0,
  centre: 50,
  right: 100,
}

export const MARK_FONTS = ['display', 'body'] as const
export type MarkFont = (typeof MARK_FONTS)[number]
export const MARK_FONT_TITLES: Record<MarkFont, string> = { display: 'Display', body: 'Body' }

export const MARK_ALIGNS = ['left', 'centre', 'right'] as const
export type MarkAlign = (typeof MARK_ALIGNS)[number]
export const MARK_ALIGN_TITLES: Record<MarkAlign, string> = {
  left: 'Left',
  centre: 'Centre',
  right: 'Right',
}

export const MARK_LAYERS = ['content', 'panel'] as const
export type MarkLayer = (typeof MARK_LAYERS)[number]
export const MARK_LAYER_TITLES: Record<MarkLayer, string> = {
  content: 'Behind the content',
  panel: 'Behind the panel',
}

export const MARK_TEXT_MAX = 24
export const MARK_OFFSET_MAX = 25
export const MARK_ROTATION_MAX = 30
export const MARK_ROTATION_STEP = 5
export const MARK_OPACITY_MIN = 2
export const MARK_OPACITY_MAX = { text: 20, icon: 20, picture: 40 } as const
const MARK_OPACITY_DEFAULT = { text: 8, icon: 8, picture: 15 } as const

const MARK_COLOURS: readonly ThemeColour[] = [
  'inherit',
  'ink',
  'muted',
  'accent',
  'accent-2',
  'highlight',
  'custom',
]

/** The stored fields, as a query returns them (`pictureUrl` is the approved frame's artwork). */
export interface MarkInput {
  kind?: string | null
  text?: string | null
  font?: string | null
  align?: string | null
  pictureUrl?: string | null
  keepColours?: boolean | null
  icon?: string | null
  size?: string | null
  phoneScale?: string | null
  anchor?: string | null
  offsetX?: number | null
  offsetY?: number | null
  colour?: ThemeColourInput | null
  opacity?: number | null
  rotation?: number | null
  layer?: string | null
}

export type MarkContent =
  | { kind: 'text'; text: string; font: MarkFont; align: MarkAlign }
  | { kind: 'picture'; url: string; keepColours: boolean }
  | { kind: 'icon'; icon: string }

export type ResolvedMark = MarkContent & {
  size: MarkSize
  phoneScale: MarkPhoneScale
  /** Percent from the container's left and top, and of the mark's own box to pull it back by. */
  x: number
  y: number
  offsetX: number
  offsetY: number
  /** CSS colour; undefined is the surrounding text colour. Unused by a picture keeping its colours. */
  colour?: string
  /** The stored choice, for the contrast check. */
  storedColour?: ThemeColourInput | null
  /** 0 to 1, within the kind's bounds, before the contrast check. */
  opacity: number
  rotation: number
  layer: MarkLayer
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const numberOr = (value: number | null | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Twice the widest a mark is drawn (70% of a 80rem container, at most): a faint mark needs no more. */
const PICTURE_WIDTH = 1280

function contentOf(input: MarkInput): MarkContent | null {
  switch (pick(MARK_KINDS, input.kind)) {
    case 'text': {
      const text = stegaClean(input.text ?? '')
        .trim()
        .slice(0, MARK_TEXT_MAX)
      if (!text) return null
      return {
        kind: 'text',
        text,
        font: pick(MARK_FONTS, input.font) ?? 'display',
        align: pick(MARK_ALIGNS, input.align) ?? 'centre',
      }
    }
    case 'picture': {
      // Only the image CDN's own URLs reach CSS, resized like every approved frame (frameMaskUrl): a
      // 2400 px original is never downloaded for a faint mark, and nothing can close the url().
      const url = isCdnUrl(input.pictureUrl)
        ? frameMaskUrl(stegaClean(input.pictureUrl), PICTURE_WIDTH)
        : undefined
      if (!url) return null
      return { kind: 'picture', url, keepColours: stegaClean(input.keepColours) === true }
    }
    case 'icon': {
      const icon = stegaClean(input.icon ?? '')
      return BADGE_ICONS.some(({ value }) => value === icon) ? { kind: 'icon', icon } : null
    }
    default:
      return null
  }
}

/**
 * A mark from its stored fields, every value inside its bounds, or null when there is nothing to draw:
 * None, unset, or a kind with no content of its own (the reason adding the field changes no page).
 */
export function resolveDecorativeMark(input: MarkInput | null | undefined): ResolvedMark | null {
  if (!input) return null
  const content = contentOf(input)
  if (!content) return null
  const anchor = pick(MARK_ANCHORS, input.anchor) ?? 'top-centre'
  const [vertical, horizontal] = anchor.split('-') as [Vertical, Horizontal]
  const rotation = clamp(numberOr(input.rotation, 0), -MARK_ROTATION_MAX, MARK_ROTATION_MAX)
  const colour = themeColourCss(input.colour, MARK_COLOURS)
  return {
    ...content,
    size: pick(MARK_SIZES, input.size) ?? 'medium',
    phoneScale: pick(MARK_PHONE_SCALES, input.phoneScale) ?? 'same',
    x: AXIS[horizontal],
    y: AXIS[vertical],
    offsetX: clamp(numberOr(input.offsetX, 0), -MARK_OFFSET_MAX, MARK_OFFSET_MAX),
    offsetY: clamp(numberOr(input.offsetY, 0), -MARK_OFFSET_MAX, MARK_OFFSET_MAX),
    ...(colour ? { colour } : {}),
    storedColour: input.colour,
    opacity:
      clamp(
        numberOr(input.opacity, MARK_OPACITY_DEFAULT[content.kind]),
        MARK_OPACITY_MIN,
        MARK_OPACITY_MAX[content.kind],
      ) / 100,
    rotation: Math.round(rotation / MARK_ROTATION_STEP) * MARK_ROTATION_STEP,
    layer: pick(MARK_LAYERS, input.layer) ?? 'content',
  }
}
