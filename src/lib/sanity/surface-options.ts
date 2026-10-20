import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { glass } from '@/config/tokens.generated'
import type { GlassStrength } from '@/lib/color/glass-contrast'

import { SHAPE_RADIUS, SOCIAL_STYLES, type SocialStyle } from './social-style-options'
import { themeColourCss, type ThemeColour, type ThemeColourInput } from './theme-colour'

/**
 * A surface's own fill and border, changed one property at a time (README, "Link list": Card design
 * and overrides): a link card, an icon's container or a social button. Kept free of Studio code so the
 * site can import it, and not tied to the Link list, so other cards can reuse it (build plan).
 *
 * Every property is optional. Unset keeps what the component draws on its own (its preset), so a
 * surface with nothing chosen looks exactly as it did before these settings existed. A chosen value
 * changes only that property: a new border colour keeps the preset's width, a tint keeps the glass.
 *
 * Two kinds of surface draw these differently:
 * - `ring`: a solid surface whose border is an inset ring (a box shadow), so a thicker border never
 *   changes the element's size. The background is a colour at a strength.
 * - `glass`: frosted glass (`.glass-row` in globals.css). A colour tints the glass at the glass's
 *   strength and the blur stays, so "Glass with a teal background and a gold border" still reads as
 *   glass. Only Solid makes it opaque, and only when chosen.
 */

export const SURFACE_BORDERS = ['none', 'thin', 'medium', 'thick'] as const
export type SurfaceBorder = (typeof SURFACE_BORDERS)[number]
export const SURFACE_BORDER_TITLES: Record<SurfaceBorder, string> = {
  none: 'None',
  thin: 'Thin',
  medium: 'Medium',
  thick: 'Thick',
}
/** In pixels. None is a real zero, never "inherit". */
export const SURFACE_BORDER_PX: Record<SurfaceBorder, number> = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3,
}
// Full class names, so Tailwind's scanner sees them.
const RING_WIDTH: Record<SurfaceBorder, string> = {
  none: 'ring-0',
  thin: 'ring-1',
  medium: 'ring-2',
  thick: 'ring-3',
}

/** How much of the background colour shows: the glass strengths, then Solid. */
export const SURFACE_STRENGTHS = ['light', 'medium', 'strong', 'solid'] as const
export type SurfaceStrength = (typeof SURFACE_STRENGTHS)[number]
export const SURFACE_STRENGTH_TITLES: Record<SurfaceStrength, string> = {
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
  solid: 'Solid',
}
/** 0 to 1. The see-through strengths are the glass tokens', so a tint matches the glass it sits in. */
export const SURFACE_STRENGTH_FRACTION: Record<SurfaceStrength, number> = {
  light: glass.light,
  medium: glass.medium,
  strong: glass.strong,
  solid: 1,
}

/** The colours a background offers (Inherit and Custom too). Transparent is a real "no fill". */
export const SURFACE_COLOUR_CHOICES = [
  'accent',
  'accent-2',
  'highlight',
  'ink',
  'transparent',
] as const
/** The colours a border offers (Inherit and Custom too). */
export const BORDER_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const

const BACKGROUND_OFFERED: readonly ThemeColour[] = ['inherit', ...SURFACE_COLOUR_CHOICES, 'custom']
const BORDER_OFFERED: readonly ThemeColour[] = ['inherit', ...BORDER_COLOUR_CHOICES, 'custom']

/** The stored fields, as a query returns them. */
export interface SurfaceInput {
  background?: ThemeColourInput | null
  backgroundStrength?: string | null
  border?: string | null
  borderColour?: ThemeColourInput | null
}

/** A resolved surface layer: a property is present only when it was chosen (see design-overrides.ts). */
export interface SurfaceDesign {
  /** A CSS colour, or `'transparent'`. */
  background?: string
  strength?: SurfaceStrength
  border?: SurfaceBorder
  borderColour?: string
}

const pick = <T extends string>(allowed: readonly T[], value: string | null | undefined) => {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/** Only the chosen properties, so the result can be layered (`layerDesign`). */
export function resolveSurface(input: SurfaceInput | null | undefined): SurfaceDesign {
  const design: SurfaceDesign = {}
  // Primary as a fill is the brand colour itself, not the shade Brand colours keeps readable as text.
  const background =
    stegaClean(input?.background?.colour) === 'accent'
      ? 'var(--color-accent)'
      : themeColourCss(input?.background, BACKGROUND_OFFERED)
  if (background !== undefined) design.background = background
  const strength = pick(SURFACE_STRENGTHS, input?.backgroundStrength)
  if (strength !== undefined) design.strength = strength
  const border = pick(SURFACE_BORDERS, input?.border)
  if (border !== undefined) design.border = border
  const borderColour = themeColourCss(input?.borderColour, BORDER_OFFERED)
  if (borderColour !== undefined) design.borderColour = borderColour
  return design
}

export interface Look {
  className: string
  style: CSSProperties | undefined
}

/** What a ring surface draws while a property is unchanged. */
export interface OwnRingSurface {
  /** Background classes (hover included), used while neither colour nor strength is chosen. */
  background: string
  /** Border classes, used while neither width nor colour is chosen. */
  border: string
  /** The colour a strength alone applies to. */
  fill?: string
  /** The width a colour alone is drawn at. */
  borderWidth?: SurfaceBorder
  /** The colour a width alone is drawn in. */
  borderColour?: string
}

/** What glass draws while a property is unchanged. */
export interface OwnGlassSurface {
  /** The strength the glass is at: a colour alone tints the glass at it. */
  strength: GlassStrength
}

const percent = (fraction: number) => `${String(Math.round(fraction * 1000) / 10)}%`

/** `colour` at `fraction`, as CSS; transparent stays transparent. */
function atStrength(colour: string, fraction: number): string {
  if (colour === 'transparent') return 'transparent'
  return fraction >= 1 ? colour : `color-mix(in oklch, ${colour} ${percent(fraction)}, transparent)`
}

const joinClasses = (...classes: string[]) => classes.filter(Boolean).join(' ')

/** A solid surface's classes and style: the own classes for what is unchanged, variables for the rest. */
export function ringSurfaceLook(design: SurfaceDesign, own: OwnRingSurface): Look {
  const style: Record<string, string> = {}
  let background = own.background
  if (design.background !== undefined || design.strength !== undefined) {
    const colour = design.background ?? own.fill ?? 'var(--color-surface)'
    style['--surface-bg'] = atStrength(
      colour,
      SURFACE_STRENGTH_FRACTION[design.strength ?? 'solid'],
    )
    // A hover a shade towards the text colour, which reads on any fill (and on none).
    background =
      'bg-(--surface-bg) hover:bg-[color-mix(in_oklch,var(--surface-bg),var(--color-ink)_7%)]'
  }
  let border = own.border
  if (design.border !== undefined || design.borderColour !== undefined) {
    const width = design.border ?? own.borderWidth ?? 'thin'
    style['--surface-border'] = design.borderColour ?? own.borderColour ?? 'var(--color-line)'
    border = width === 'none' ? 'ring-0' : `${RING_WIDTH[width]} ring-inset ring-(--surface-border)`
  }
  return {
    className: joinClasses(background, border),
    style: Object.keys(style).length > 0 ? style : undefined,
  }
}

/**
 * Glass, changed through the override variables `.glass-row` reads (globals.css), which may sit on
 * the glass or on an element around it: the blur, the glass's own shadow and the nearly solid
 * fallback for browsers that can't blur all stay. A colour tints the glass at the glass's strength
 * unless a strength is chosen too.
 */
export function glassSurfaceLook(design: SurfaceDesign, own: OwnGlassSurface): Look {
  const style: Record<string, string> = {}
  if (design.background !== undefined || design.strength !== undefined) {
    const colour = design.background ?? 'var(--color-surface)'
    const fraction = SURFACE_STRENGTH_FRACTION[design.strength ?? own.strength]
    style['--glass-tint'] = atStrength(colour, fraction)
    // Where the glass can't blur (or the visitor asks for less transparency) it stays nearly solid,
    // in the tint; a transparent tint keeps the tone's own nearly solid surface, to stay readable.
    if (colour !== 'transparent') style['--glass-tint-solid'] = atStrength(colour, 0.95)
  }
  if (design.border !== undefined) {
    style['--glass-border-width'] = `${String(SURFACE_BORDER_PX[design.border])}px`
  }
  if (design.borderColour !== undefined) style['--glass-border-colour'] = design.borderColour
  return {
    className: '',
    style: Object.keys(style).length > 0 ? style : undefined,
  }
}

/*
 * Icon containers: the shape an icon sits in (a Link list link's icon, build plan: other cards later),
 * its fill and border (the surface above) and the icon's own colour. The shapes are the social icon
 * styles, so a circle is the same circle in both places.
 */

export const ICON_SHAPES = SOCIAL_STYLES
export type IconShape = SocialStyle
export const ICON_SHAPE_TITLES: Record<IconShape, string> = {
  plain: 'No container',
  circle: 'Circle',
  rounded: 'Rounded square',
  square: 'Square',
}

/** The stored fields of an icon's look, as a query returns them. */
export interface IconDesignInput {
  iconShape?: string | null
  iconColour?: ThemeColourInput | null
  iconBackground?: ThemeColourInput | null
  iconBackgroundStrength?: string | null
  iconBorder?: string | null
  iconBorderColour?: ThemeColourInput | null
}

export interface IconDesign extends SurfaceDesign {
  shape?: IconShape
  /** The icon's own colour (CSS). */
  colour?: string
}

/** The colours an icon itself offers (Inherit and Custom too). */
export const ICON_COLOUR_CHOICES = ['ink', 'muted', 'accent', 'accent-2', 'highlight'] as const
const ICON_OFFERED: readonly ThemeColour[] = ['inherit', ...ICON_COLOUR_CHOICES, 'custom']

/** Only the chosen properties, so the result can be layered. */
export function resolveIconDesign(input: IconDesignInput | null | undefined): IconDesign {
  const design: IconDesign = resolveSurface({
    background: input?.iconBackground,
    backgroundStrength: input?.iconBackgroundStrength,
    border: input?.iconBorder,
    borderColour: input?.iconBorderColour,
  })
  const shape = pick(ICON_SHAPES, input?.iconShape)
  if (shape !== undefined) design.shape = shape
  const colour = themeColourCss(input?.iconColour, ICON_OFFERED)
  if (colour !== undefined) design.colour = colour
  return design
}

/** What a layout's icon looks like with nothing chosen. */
export interface OwnIcon {
  shape: IconShape
  /** The container's fill and border classes, for the shaped styles (unused for plain). */
  background: string
  border: string
  /** The icon's colour class while no colour is chosen. */
  colour?: string
}

/** The fill and border a shaped container starts from in a layout that draws its icons plain. */
export const DEFAULT_ICON_CONTAINER = {
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
} as const

export interface IconLook {
  shape: IconShape
  /** For the container (empty for plain): corners, fill and border. */
  className: string
  style: CSSProperties | undefined
}

/**
 * An icon's container. A plain icon has none (fill and border don't apply); the shaped styles take
 * their corners from the shape and their fill and border from the layout's own, changed one property
 * at a time. The icon's colour is set on the container, which the icon inherits.
 */
export function iconLook(design: IconDesign, own: OwnIcon): IconLook {
  const shape = design.shape ?? own.shape
  const colourClass = design.colour === undefined ? (own.colour ?? '') : ''
  const colourStyle = design.colour === undefined ? undefined : { color: design.colour }
  if (shape === 'plain') return { shape, className: colourClass, style: colourStyle }
  const fromPlain = own.shape === 'plain'
  const surface = ringSurfaceLook(design, {
    background: fromPlain ? DEFAULT_ICON_CONTAINER.background : own.background,
    border: fromPlain ? DEFAULT_ICON_CONTAINER.border : own.border,
    fill: 'var(--color-surface-alt)',
  })
  return {
    shape,
    className: joinClasses(SHAPE_RADIUS[shape], surface.className, colourClass),
    style: surface.style || colourStyle ? { ...surface.style, ...colourStyle } : undefined,
  }
}
