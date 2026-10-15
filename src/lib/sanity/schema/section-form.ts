import type { ConditionalPropertyCallback } from 'sanity'

import { SECTION_MOTIONS, edgeAllowsFlip, edgeAllowsInvert } from '../section-style-options'

/**
 * Which of a section's shared design options make sense for the layout it is on. The options live in
 * the shared `sectionStyle` type, so their `hidden` callbacks and validation find the section they
 * belong to by walking the field's path from the document, then ask the rules the section registered
 * through `sectionFields` (section-style.ts). Pure (types only from Studio), so it is unit-tested.
 *
 * A section that registers nothing has no picture and no fixed alignment: Parallax is withheld and
 * every other option is offered. When the section can't be found at all (a path we don't understand)
 * everything is offered, because hiding an option wrongly is worse than showing one that does nothing.
 */

export interface SectionValue {
  _type?: string
  variant?: string
  [key: string]: unknown
}

export interface SectionFormRules {
  /** Whether this layout has a picture for Parallax to move. */
  hasPicture?: (section: SectionValue) => boolean
  /** Whether this layout sets its own alignment, so the Alignment option does not apply. */
  fixesAlignment?: (section: SectionValue) => boolean
  /**
   * Whether this layout already has a picture behind its content (the hero's own image), so the
   * shared Background image does not apply. Gradients still do.
   */
  hasOwnBackgroundImage?: (section: SectionValue) => boolean
}

const RULES = new Map<string, SectionFormRules>()

export function registerSectionRules(type: string, rules: SectionFormRules): void {
  RULES.set(type, rules)
}

export function sectionRulesFor(type: string | undefined): SectionFormRules {
  return (type ? RULES.get(type) : undefined) ?? {}
}

type PathSegment = string | number | { _key?: string } | readonly [number | '', number | '']

/** The section a `style` field belongs to: the value at its path minus `style` and the field's name. */
export function sectionAtStylePath(
  document: unknown,
  path: readonly PathSegment[] | undefined,
): SectionValue | undefined {
  if (!path || path.length < 2) return undefined
  let current: unknown = document
  for (const segment of path.slice(0, -2)) {
    if (current === null || typeof current !== 'object') return undefined
    if (typeof segment === 'string') {
      current = (current as Record<string, unknown>)[segment]
    } else if (typeof segment === 'number') {
      current = Array.isArray(current) ? (current as unknown[])[segment] : undefined
    } else if (!Array.isArray(segment) && '_key' in segment) {
      current = Array.isArray(current)
        ? (current as { _key?: string }[]).find((item) => item._key === segment._key)
        : undefined
    } else {
      return undefined
    }
  }
  return current !== null && typeof current === 'object' ? (current as SectionValue) : undefined
}

/** Whether Parallax has something to move in this section's chosen layout. */
export function allowsParallax(section: SectionValue | undefined): boolean {
  if (!section) return true
  return sectionRulesFor(section._type).hasPicture?.(section) ?? false
}

/** Whether Alignment does anything on this section's chosen layout. */
export function allowsAlignment(section: SectionValue | undefined): boolean {
  if (!section) return true
  return !sectionRulesFor(section._type).fixesAlignment?.(section)
}

/** Whether the shared Background image makes sense: not where the section draws a picture of its own. */
export function allowsBackgroundImage(section: SectionValue | undefined): boolean {
  if (!section) return true
  return !sectionRulesFor(section._type).hasOwnBackgroundImage?.(section)
}

/** The animations to offer: every one, minus Parallax where there is no picture to move. */
export function visibleMotions(section: SectionValue | undefined): readonly string[] {
  return allowsParallax(section)
    ? SECTION_MOTIONS
    : SECTION_MOTIONS.filter((motion) => motion !== 'parallax')
}

interface FieldContext {
  document?: unknown
  path?: readonly PathSegment[]
}

/**
 * Hides Alignment where the layout sets its own. A value left over from another layout keeps the
 * field visible, so the editor can see the warning below and clear it.
 */
export const alignmentHidden: ConditionalPropertyCallback = ({ document, path, value }) =>
  !value && !allowsAlignment(sectionAtStylePath(document, path))

/**
 * Hides Background image (and its overlay) where the layout has its own picture, unless a picture
 * is already set, so it stays visible to be removed.
 */
export const backgroundImageHidden: ConditionalPropertyCallback = ({ document, path, parent }) =>
  !(parent as { image?: { asset?: unknown } } | undefined)?.image?.asset &&
  !allowsBackgroundImage(sectionAtStylePath(document, path))

/** The overlay only means something once there is a picture to cover. */
export const overlayHidden: ConditionalPropertyCallback = ({ document, path, parent }) =>
  !(parent as { image?: { asset?: unknown } } | undefined)?.image?.asset ||
  !allowsBackgroundImage(sectionAtStylePath(document, path))

/** The warning for an Alignment value the chosen layout ignores; true when there is nothing to say. */
export function staleAlignmentMessage(value: unknown, context: FieldContext): string | true {
  if (!value || allowsAlignment(sectionAtStylePath(context.document, context.path))) return true
  return 'This layout sets its own alignment, so this choice is left over from another layout. Reset it from the field menu.'
}

/** The warning for Parallax left on a section whose layout has no picture. */
export function staleMotionMessage(value: unknown, context: FieldContext): string | true {
  if (value !== 'parallax' || allowsParallax(sectionAtStylePath(context.document, context.path))) {
    return true
  }
  return 'Parallax moves a picture, and this layout has none. Choose another animation, or a layout with a picture.'
}

interface EdgeParent {
  edge?: string
}

const edgeOf = (parent: unknown) => (parent as EdgeParent | undefined)?.edge
const hasEdge = (edge: string | undefined) => !!edge && edge !== 'none'

/** The edge's options mean nothing until a shape is chosen. */
export const edgeOptionsHidden: ConditionalPropertyCallback = ({ parent }) =>
  !hasEdge(edgeOf(parent))

/** Curve and Arch are symmetrical, so mirroring them would change nothing. */
export const edgeFlipHidden: ConditionalPropertyCallback = ({ parent }) =>
  !edgeAllowsFlip(edgeOf(parent))

/** A diagonal turned upside down is a mirrored diagonal, so Invert is for the curved shapes. */
export const edgeInvertHidden: ConditionalPropertyCallback = ({ parent }) =>
  !edgeAllowsInvert(edgeOf(parent))

/** Only the layered wave has a back wave to colour. */
export const edgeLayerHidden: ConditionalPropertyCallback = ({ parent }) =>
  edgeOf(parent) !== 'layered'
