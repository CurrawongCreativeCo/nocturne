import type { ConditionalPropertyCallback } from 'sanity'

import {
  customFieldsFor,
  isMotionPreset,
  motionUses,
  PICTURE_PRESETS,
  type MotionCustomField,
  type MotionOption,
} from '@/components/motion/presets'
import { LAYERED_PRESETS, allowsLayerBelow } from '@/components/ui/edge-presets'

import {
  GENERATED_EDGE_HEIGHT_BOUNDS,
  GENERATED_EDGE_HEIGHTS,
  SECTION_EDGE_DEPTHS,
  SECTION_EDGE_HEIGHTS,
  SECTION_MOTIONS,
  type GeneratedEdgeScreen,
  isGeneratedEdge,
  edgeAllowsAccent,
  edgeAllowsFlip,
  edgeAllowsInvert,
  imageSizeUsesFixed,
  imageSizeUsesPosition,
  imageSizeUsesRepeat,
} from '../section-style-options'

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
  /**
   * Whether this layout draws a picture or video behind its text (a hero's Full background, the
   * ambient video), which a panel then sits over. SectionFrame sees the same thing as its `background`.
   */
  drawsBackground?: (section: SectionValue) => boolean
  /**
   * Whether this layout draws its own surfaces (the Link list's cards), so the shared Panel doesn't
   * apply and isn't offered. Register `ownsSurfaces` from lib/design/section-surfaces.ts: SectionRenderer
   * applies the same rule on the page.
   */
  ownsSurfaces?: (section: SectionValue) => boolean
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

/** Whether the shared Panel makes sense: not where the section draws its own surfaces. */
export function allowsPanel(section: SectionValue | undefined): boolean {
  if (!section) return true
  return !sectionRulesFor(section._type).ownsSurfaces?.(section)
}

/** Whether the layout draws a picture or video of its own behind its content (a hero's background). */
export function sectionHasOwnBackground(section: SectionValue | undefined): boolean {
  return section ? (sectionRulesFor(section._type).drawsBackground?.(section) ?? false) : false
}

/** The animations to offer: every one, minus Float and Parallax where there is no picture to move. */
export function visibleMotions(section: SectionValue | undefined): readonly string[] {
  return allowsParallax(section)
    ? SECTION_MOTIONS
    : SECTION_MOTIONS.filter((motion) => !PICTURE_PRESETS.includes(motion))
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

/** Panel and its options are hidden where the section draws its own surfaces. */
export const panelHidden: ConditionalPropertyCallback = ({ document, path }) =>
  !allowsPanel(sectionAtStylePath(document, path))

/** Panel strength is for Glass: Solid card and None have nothing to strengthen. */
export const panelStrengthHidden: ConditionalPropertyCallback = ({ document, path, parent }) =>
  (parent as { panel?: string } | undefined)?.panel !== 'glass' ||
  !allowsPanel(sectionAtStylePath(document, path))

/** The overlay only means something once there is a picture to cover. */
export const overlayHidden: ConditionalPropertyCallback = ({ document, path, parent }) =>
  !(parent as { image?: { asset?: unknown } } | undefined)?.image?.asset ||
  !allowsBackgroundImage(sectionAtStylePath(document, path))

type ImageOption = 'position' | 'repeat' | 'fixed' | 'any'

const imageOptionApplies = (option: ImageOption, size: unknown) =>
  option === 'position'
    ? imageSizeUsesPosition(size as string)
    : option === 'repeat'
      ? imageSizeUsesRepeat(size as string)
      : option === 'fixed'
        ? imageSizeUsesFixed(size as string)
        : true

/**
 * A background-image option is shown only with a picture, and Position and Repeat only for the sizes
 * that use them. A value left over from another size keeps its field visible, so the editor can see
 * the warning below and clear it.
 */
export const imageOptionHidden =
  (option: ImageOption): ConditionalPropertyCallback =>
  ({ document, path, parent, value }) => {
    const style = parent as { image?: { asset?: unknown }; imageSize?: string } | undefined
    if (!style?.image?.asset || !allowsBackgroundImage(sectionAtStylePath(document, path))) {
      return true
    }
    return !value && !imageOptionApplies(option, style.imageSize)
  }

/** The warning for a Position or Repeat value the chosen size ignores; true when there is nothing to say. */
export function staleImageOptionMessage(
  option: Exclude<ImageOption, 'any' | 'fixed'>,
  value: unknown,
  context: { parent?: unknown },
): string | true {
  const size = (context.parent as { imageSize?: string } | undefined)?.imageSize
  if (!value || imageOptionApplies(option, size)) return true
  return option === 'position'
    ? 'Fill the section and Cover the screen use the picture’s hotspot, so this position is ignored. Choose Show the whole picture or Actual size, or clear it.'
    : 'Only Actual size can repeat, so this is ignored. Choose Actual size, or clear it.'
}

/** The warning for an Alignment value the chosen layout ignores; true when there is nothing to say. */
export function staleAlignmentMessage(value: unknown, context: FieldContext): string | true {
  if (!value || allowsAlignment(sectionAtStylePath(context.document, context.path))) return true
  return 'This layout sets its own alignment, so this choice is left over from another layout. Reset it from the field menu.'
}

/** The warning for Float or Parallax left on a section whose layout has no picture. */
export function staleMotionMessage(value: unknown, context: FieldContext): string | true {
  if (
    !isMotionPreset(value) ||
    !PICTURE_PRESETS.includes(value) ||
    allowsParallax(sectionAtStylePath(context.document, context.path))
  ) {
    return true
  }
  return 'Float and Parallax move a picture, and this layout has none. Choose another animation, or a layout with a picture.'
}

const motionOf = (parent: unknown) => {
  const motion = (parent as { motion?: unknown } | undefined)?.motion
  return isMotionPreset(motion) ? motion : undefined
}

/** An Advanced animation option is shown only while the chosen animation uses it. */
export const motionOptionHidden =
  (option: MotionOption): ConditionalPropertyCallback =>
  ({ parent }) => {
    const motion = motionOf(parent)
    return !motion || !motionUses(motion, option)
  }

/** An exact value is shown only with "Set exact values" on, and only where the animation takes it. */
export const motionCustomHidden =
  (field: MotionCustomField): ConditionalPropertyCallback =>
  ({ parent }) => {
    const motion = motionOf(parent)
    return (
      !motion ||
      (parent as { motionCustom?: boolean } | undefined)?.motionCustom !== true ||
      !customFieldsFor(motion).includes(field)
    )
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

/** The accent line is for today's shapes: Tide and Contour bring their own ornament. */
export const edgeAccentHidden: ConditionalPropertyCallback = ({ parent }) =>
  !edgeAllowsAccent(edgeOf(parent))

/** Only Tide has a back crest to colour. */
export const edgeTideLayerHidden: ConditionalPropertyCallback = ({ parent }) =>
  edgeOf(parent) !== 'tide'

/** Only Contour has lines to colour. */
export const edgeLineColourHidden: ConditionalPropertyCallback = ({ parent }) =>
  edgeOf(parent) !== 'contour'

interface GeneratedEdgeParent extends EdgeParent {
  edgeDepth?: string
  edgeHeight?: string
}

/** The generated shapes' controls mean nothing for any other shape. */
export const edgeGeneratedHidden: ConditionalPropertyCallback = ({ parent }) =>
  !isGeneratedEdge(edgeOf(parent))

/**
 * A generated shape's control left over on another shape stays visible, so the editor can see the warning
 * below and clear it; it is hidden once there is nothing to say.
 */
export const edgeGeneratedOptionHidden: ConditionalPropertyCallback = ({ parent, value }) =>
  !isGeneratedEdge(edgeOf(parent)) && !value

/** The warning for a generated shape's control left on another shape; true when there is nothing to say. */
export function staleGeneratedOptionMessage(
  value: unknown,
  context: { parent?: unknown },
): string | true {
  if (!value || isGeneratedEdge(edgeOf(context.parent))) return true
  return 'This choice belongs to Still water and is ignored by the shape chosen above. Clear it from the field menu.'
}

const depthOf = (parent: unknown) => {
  const depth = (parent as GeneratedEdgeParent | undefined)?.edgeDepth
  return SECTION_EDGE_DEPTHS.find((option) => option === depth) ?? 'standard'
}

/** Whether the depth chosen offers a layer below; any other shape has no layer below to offer. */
const offersLayerBelow = (parent: unknown) => {
  const edge = edgeOf(parent)
  return isGeneratedEdge(edge) && allowsLayerBelow(LAYERED_PRESETS[edge], depthOf(parent))
}

/**
 * Layer below is not offered at Shallow, where the layer is too thin to read. A value already stored there
 * keeps the field visible, so the editor can see the warning below; the edge draws without it.
 */
export const edgeLayerBelowHidden: ConditionalPropertyCallback = ({ parent, value }) =>
  !isGeneratedEdge(edgeOf(parent)) || (!offersLayerBelow(parent) && value !== true)

/** The warning for a layer below saved under a depth that does not offer one; the saved value is kept. */
export function staleLayerBelowMessage(
  value: unknown,
  context: { parent?: unknown },
): string | true {
  if (value !== true || !isGeneratedEdge(edgeOf(context.parent))) return true
  if (offersLayerBelow(context.parent)) return true
  return 'A layer below is not drawn at Shallow depth, so this is ignored. Choose Standard or Deep to show it, or turn it off.'
}

/** Small is not drawn for a generated shape: Studio refuses it, and the page draws Medium. */
export function generatedHeightMessage(
  value: unknown,
  context: { parent?: unknown },
): string | true {
  if (!isGeneratedEdge(edgeOf(context.parent))) return true
  const allowed = GENERATED_EDGE_HEIGHTS as readonly unknown[]
  if (!SECTION_EDGE_HEIGHTS.some((size) => size === value) || allowed.includes(value)) return true
  return 'Still water is not drawn at Small: its layers need a taller band to read. Choose Medium or Large. Until then it is drawn at Medium.'
}

/** A custom height of a generated shape must sit within what that screen size is proven for. */
export function generatedCustomHeightMessage(
  screen: GeneratedEdgeScreen,
  value: unknown,
  context: { parent?: unknown },
): string | true {
  if (typeof value !== 'number' || !isGeneratedEdge(edgeOf(context.parent))) return true
  const { min, max } = GENERATED_EDGE_HEIGHT_BOUNDS[screen]
  if (value >= min && value <= max) return true
  return `Still water is drawn between ${String(min)} and ${String(max)} px on this screen size. Until this is changed it is drawn at the nearest one.`
}
