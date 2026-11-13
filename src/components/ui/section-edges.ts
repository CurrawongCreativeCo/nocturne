import type {
  SECTION_EDGE_ACCENTS,
  SECTION_EDGE_HEIGHTS,
  SECTION_EDGE_LAYERS,
  SECTION_EDGE_LINE_COLOURS,
  SECTION_EDGE_TIDE_LAYERS,
} from '@/lib/sanity/section-style-options'

import { contourComposition, tideComposition } from './edge-fixed'

/**
 * Section dividers (README, "Section dividers"): the shapes, and the spacing maths that keeps the next
 * section's content clear of them. Pure, so it is unit-tested; SectionFrame and SectionRenderer draw it.
 *
 * Every path lives in a 0-1 box (`viewBox="0 0 1 1"`, `preserveAspectRatio="none"`) and is stretched to
 * the section's width and the edge's height. x runs left to right; y runs from the top of the edge band
 * (0) to the section's bottom (1). A shape is the LINE where the section ends: the section is kept
 * above it and cut away below it, so the next section shows through underneath.
 */

/** Today's shapes, each drawn from its line (`LINES`). */
export type LineShape = 'diagonal' | 'wave' | 'curve' | 'arch' | 'layered'
/** New shapes (task 151), each drawn as a composition (`edgeComposition`). */
export type ComposedShape = 'tide' | 'contour'
export type EdgeShape = LineShape | ComposedShape
export type EdgeHeightSize = (typeof SECTION_EDGE_HEIGHTS)[number]
export type EdgeAccent = (typeof SECTION_EDGE_ACCENTS)[number]
export type EdgeLayer = (typeof SECTION_EDGE_LAYERS)[number]
export type EdgeTideLayer = (typeof SECTION_EDGE_TIDE_LAYERS)[number]
export type EdgeLineColour = (typeof SECTION_EDGE_LINE_COLOURS)[number]

/** How tall the edge is: a token size (responsive: see `edge` in tokens.json), or the Advanced override. */
export type EdgeHeight =
  | { kind: 'token'; size: EdgeHeightSize }
  | { kind: 'custom'; mobile: string; tablet: string; desktop: string }

/** A section's bottom edge once its style has been read: only combinations that make sense. */
export interface ResolvedEdge {
  shape: EdgeShape
  flip: boolean
  invert: boolean
  height: EdgeHeight
  /** The thin line along the edge; 'none' draws no line. */
  accent: EdgeAccent
  /** The back wave's colour; meaningful only for the layered wave. */
  layer: EdgeLayer
  /** Tide's back crest colour; meaningful only for Tide. */
  tideLayer: EdgeTideLayer
  /** Contour's line colour; meaningful only for Contour. */
  lineColour: EdgeLineColour
}

type Command = 'M' | 'L' | 'C' | 'Q'
/** An absolute path command and its coordinate pairs. */
type Segment = readonly [Command, ...number[]]

/** A sine wave as cubic Béziers (one per eighth of a period), so it stays smooth when stretched. */
function wave(mean: number, amplitude: number, periods: number, phase: number): Segment[] {
  const steps = 8 * periods
  const y = (x: number) => mean + amplitude * Math.sin(2 * Math.PI * periods * x + phase)
  const slope = (x: number) =>
    amplitude * 2 * Math.PI * periods * Math.cos(2 * Math.PI * periods * x + phase)
  const dx = 1 / steps
  const segments: Segment[] = [['M', 0, y(0)]]
  for (let i = 0; i < steps; i++) {
    const x0 = i * dx
    const x1 = (i + 1) * dx
    segments.push([
      'C',
      x0 + dx / 3,
      y(x0) + (slope(x0) * dx) / 3,
      x1 - dx / 3,
      y(x1) - (slope(x1) * dx) / 3,
      x1,
      y(x1),
    ])
  }
  return segments
}

/**
 * The phase is not a multiple of a quarter turn on purpose: the wave is then not its own mirror image,
 * so Flip and Invert each make a visibly different wave.
 */
const WAVE_PHASE = 0.6 * Math.PI

const LINES: Record<LineShape, Segment[]> = {
  // Ends level with the top of the band on the left and the bottom on the right.
  diagonal: [
    ['M', 0, 0],
    ['L', 1, 1],
  ],
  wave: wave(0.5, 0.38, 1, WAVE_PHASE),
  // The section bulges down in the middle: the bottom half of an ellipse.
  curve: [
    ['M', 0, 0],
    ['C', 0, 0.5523, 0.2239, 1, 0.5, 1],
    ['C', 0.7761, 1, 1, 0.5523, 1, 0],
  ],
  // A doorway: the next section rises into this one in a rounded arch, with flat shoulders.
  arch: [
    ['M', 0, 1],
    ['L', 0.08, 1],
    ['C', 0.08, 0.45, 0.28, 0, 0.5, 0],
    ['C', 0.72, 0, 0.92, 0.45, 0.92, 1],
    ['L', 1, 1],
  ],
  // The front wave is the cut; the back one is drawn behind it (see `edgeBackLine`).
  layered: wave(0.42, 0.3, 1, WAVE_PHASE),
}

/** Whether a shape is one of today's, drawn from its line. */
export const isLineShape = (shape: EdgeShape): shape is LineShape => shape in LINES

/** The layered wave's back wave: lower and a little out of step with the front one. */
const BACK_LINE: Segment[] = wave(0.64, 0.3, 1, WAVE_PHASE + 0.9)

export interface EdgeTransform {
  /** Mirror left to right. */
  flip?: boolean
  /** Mirror top to bottom: the shape bulges into the next section instead. */
  invert?: boolean
}

const round = (n: number) => String(Math.round(n * 10_000) / 10_000)

function serialise(segments: readonly Segment[], { flip, invert }: EdgeTransform): string {
  return segments
    .map(([command, ...numbers]) => {
      const mapped = numbers.map((n, i) => {
        const isX = i % 2 === 0
        if (isX) return flip ? 1 - n : n
        return invert ? 1 - n : n
      })
      return `${command}${mapped.map(round).join(' ')}`
    })
    .join('')
}

/** The open path along the edge, from one side of the band to the other. */
export function edgeLine(shape: LineShape, transform: EdgeTransform = {}): string {
  return serialise(LINES[shape], transform)
}

/** The back wave of the layered wave, as an open path. */
export function edgeBackLine(transform: EdgeTransform = {}): string {
  return serialise(BACK_LINE, transform)
}

/** The area above a line, closed along the top of the band: what the section keeps. */
export function closeToTop(line: string): string {
  const numbers = line.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
  const [startX = 0] = numbers
  const endX = numbers[numbers.length - 2] ?? 1
  return `${line}L${round(endX)} 0L${round(startX)} 0Z`
}

/** The area below a line, closed along the bottom of the band: what a composed edge's over part covers. */
export function closeToBottom(line: string): string {
  const numbers = line.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
  const [startX = 0] = numbers
  const endX = numbers[numbers.length - 2] ?? 1
  return `${line}L${round(endX)} 1L${round(startX)} 1Z`
}

/** What the section keeps, as a path. */
export function edgeFill(shape: LineShape, transform: EdgeTransform = {}): string {
  return closeToTop(edgeLine(shape, transform))
}

function svgUrl(path: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none"><path d="${path}"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** The `mask-image` layer for the band: opaque where the section stays, clear where it is cut. */
export function edgeMaskImage(shape: LineShape, transform: EdgeTransform = {}): string {
  return svgUrl(edgeFill(shape, transform))
}

/** The `mask-image` layer for a composed edge: built from its cut exactly as `edgeMaskImage` is from a shape. */
export function cutMaskImage(cut: string): string {
  return svgUrl(closeToTop(cut))
}

/**
 * A theme role a composed edge's part is painted in: tone-aware, never a stored colour. `echo` is the colour
 * of the section the edge belongs to (Tide's Echo), set on the frame from its tone (`data-edge-echo`).
 */
export type EdgePaint = 'accent' | 'accent-2' | 'highlight' | 'ink' | 'ink-muted' | 'echo'

/**
 * One decorative part of a composed edge: a fill or a line on one side of the cut. An `over` part is drawn
 * inside the section, over its background and under its content, and its own mask clips it at the cut. An
 * `under` part is drawn in the frame, over the following section, and shows only where the cut removed this
 * one. A fill covers from its line to the band's far side (the bottom for `over`, the top for `under`).
 */
export type EdgePart =
  | { kind: 'fill'; side: 'over' | 'under'; line: string; paint: EdgePaint; opacity: number }
  | {
      kind: 'stroke'
      side: 'over' | 'under'
      line: string
      paint: EdgePaint
      opacity: number
      widthPx: number
    }

/**
 * A shape drawn as a composition (task 151, Stage 3 section 4): its cut, the open line the mask is built
 * from, and its parts, back to front within each side. Only new shapes are compositions: today's keep their
 * own rendering, untouched.
 */
export interface EdgeComposition {
  cut: string
  parts: readonly EdgePart[]
}

/** The shapes drawn as compositions, and how (edge-fixed.ts). Today's shapes keep their own rendering. */
const COMPOSITIONS: Record<ComposedShape, (edge: ResolvedEdge) => EdgeComposition> = {
  tide: tideComposition,
  contour: contourComposition,
}

/** The composition an edge is drawn as, or undefined for a shape that keeps its own rendering. */
export function edgeComposition(edge: ResolvedEdge): EdgeComposition | undefined {
  return isLineShape(edge.shape) ? undefined : COMPOSITIONS[edge.shape](edge)
}

/** Customised heights run from this many px to this many. Out-of-range input is clamped, not rejected. */
export const EDGE_HEIGHT_RANGE = { min: 16, max: 320 } as const

function px(value: number | null | undefined): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return `${Math.round(Math.min(EDGE_HEIGHT_RANGE.max, Math.max(EDGE_HEIGHT_RANGE.min, value)))}px`
}

/**
 * Custom heights per breakpoint (phone, tablet from 48rem, desktop from 64rem). A breakpoint left
 * blank keeps the one below it, and the phone's falls back to the Medium token.
 */
export function customEdgeHeight(input: {
  mobile?: number | null
  tablet?: number | null
  desktop?: number | null
}): Extract<EdgeHeight, { kind: 'custom' }> | undefined {
  const mobile = px(input.mobile)
  const tablet = px(input.tablet)
  const desktop = px(input.desktop)
  if (!mobile && !tablet && !desktop) return undefined
  const phone = mobile ?? 'var(--edge-height-medium)'
  const mid = tablet ?? phone
  return { kind: 'custom', mobile: phone, tablet: mid, desktop: desktop ?? mid }
}

/**
 * The CSS custom property that carries the edge's height. The frame sets `--edge-h` and the section
 * below it `--edge-above` from the same value, so the two always agree. Token heights are a single
 * `var()` (the tokens themselves are fluid); custom ones set three variables that globals.css
 * switches between at the breakpoints, marked by `data-edge-custom`.
 */
export function edgeHeightStyle(
  height: EdgeHeight,
  property: '--edge-h' | '--edge-above',
): Record<string, string> {
  if (height.kind === 'token') return { [property]: `var(--edge-height-${height.size})` }
  return {
    '--edge-custom-base': height.mobile,
    '--edge-custom-md': height.tablet,
    '--edge-custom-lg': height.desktop,
  }
}

/** Whether `edgeHeightStyle` leaves the height to globals.css (a custom one). */
export const edgeHeightIsCustom = (height: EdgeHeight) => height.kind === 'custom'
