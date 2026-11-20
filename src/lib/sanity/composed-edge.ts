import type { SanityImageData } from '@/types/sanity'

import { BADGE_ICONS, type BadgeIconName } from './badge-icons'

export const COMPOSED_EDGE_ROLES = ['accent', 'accent-2', 'highlight', 'ink', 'ink-muted'] as const
export const COMPOSED_EDGE_MODES = ['transition', 'rule'] as const
export const COMPOSED_EDGE_PLACEMENTS = ['above', 'below', 'stroke'] as const
export const COMPOSED_EDGE_HEIGHTS = ['small', 'medium', 'large'] as const
export const COMPOSED_EDGE_ALIGNS = ['start', 'center', 'end'] as const
export const COMPOSED_EDGE_INTERPOLATIONS = ['linear', 'smooth'] as const
export const COMPOSED_EDGE_MAX_POINTS = 7
export const COMPOSED_EDGE_MAX_LAYERS = 3
export const COMPOSED_EDGE_POINT_GAP = 4

type ColourRole = (typeof COMPOSED_EDGE_ROLES)[number]
interface Point {
  x: number
  y: number
}
interface Contour {
  points: Point[]
  smooth: boolean
}

type Paint =
  | { kind: 'solid'; colour: ColourRole }
  | { kind: 'gradient'; from: ColourRole; to: ColourRole; fadeEnds: boolean }

type Centre = { kind: 'icon'; icon: BadgeIconName } | { kind: 'image'; image: SanityImageData }

export interface ResolvedComposedEdge {
  shape: 'composed'
  mode: (typeof COMPOSED_EDGE_MODES)[number]
  height: { kind: 'token'; size: (typeof COMPOSED_EDGE_HEIGHTS)[number] }
  cut: string
  span: { start: number; end: number }
  layers: {
    key: string
    placement: (typeof COMPOSED_EDGE_PLACEMENTS)[number]
    path: string
    paint: Paint
    opacity: number
    strokeWidth: number
  }[]
  centre?: Centre & { x: number; y: number; gap: number }
  shadow?: { blur: number; distance: number; opacity: number }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pick = <T extends string>(options: readonly T[], value: unknown) =>
  options.find((option) => option === value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const bounded = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback

const coordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100

function readContour(value: unknown): Contour | undefined {
  if (!record(value) || !Array.isArray(value.points)) return undefined
  const points: unknown[] = value.points
  if (points.length < 2 || points.length > COMPOSED_EDGE_MAX_POINTS) return undefined
  const result: Point[] = []
  const keys = new Set<string>()
  for (const p of points) {
    if (!record(p) || !coordinate(p.x) || !coordinate(p.y)) return undefined
    const last = result.at(-1)
    if (last && p.x - last.x < COMPOSED_EDGE_POINT_GAP) return undefined
    if (typeof p._key === 'string') {
      if (keys.has(p._key)) return undefined
      keys.add(p._key)
    }
    result.push({ x: p.x, y: p.y })
  }
  if (result[0]?.x !== 0 || result.at(-1)?.x !== 100) return undefined
  if (value.interpolation != null && !pick(COMPOSED_EDGE_INTERPOLATIONS, value.interpolation)) {
    return undefined
  }
  return { points: result, smooth: value.interpolation === 'smooth' }
}

const number = (value: number) => String(Math.round(value * 10_000) / 10_000)
const pair = (x: number, y: number) => `${number(x)} ${number(y)}`
const slope = (a: Point, b: Point) => (b.y - a.y) / (b.x - a.x)

function tangent(a: Point | undefined, b: Point, c: Point | undefined) {
  if (!a) return c ? slope(b, c) : 0
  if (!c) return slope(a, b)
  const left = slope(a, b)
  const right = slope(b, c)
  return left * right > 0 ? (2 * left * right) / (left + right) : 0
}

/** Controls stay inside the segment's vertical bounds. Uniform x handles make t linear in x. */
function compile(contour: Contour, offsetX = 0, offsetY = 0) {
  const points = contour.points.map(({ x, y }) => ({
    x: (x + offsetX) / 100,
    y: clamp((y + offsetY) / 100, 0, 1),
  }))
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) throw new Error('A validated contour needs two endpoints.')
  const segments = points.slice(1).map((to, index) => {
    const from = points[index] ?? first
    const dx = (to.x - from.x) / 3
    const low = Math.min(from.y, to.y)
    const high = Math.max(from.y, to.y)
    return {
      from,
      to,
      dx,
      c1: clamp(from.y + dx * tangent(points[index - 1], from, to), low, high),
      c2: clamp(to.y - dx * tangent(from, to, points[index + 2]), low, high),
    }
  })
  // Extend a translated contour to the far side so the paint can span the whole artwork window.
  let path =
    first.x > 0 ? `M${pair(0, first.y)}L${pair(first.x, first.y)}` : `M${pair(first.x, first.y)}`
  for (const { from, to, dx, c1, c2 } of segments) {
    path += contour.smooth
      ? `C${pair(from.x + dx, c1)} ${pair(to.x - dx, c2)} ${pair(to.x, to.y)}`
      : `L${pair(to.x, to.y)}`
  }
  if (last.x < 1) path += `L${pair(1, last.y)}`

  return {
    path,
    yAt(x: number): number {
      if (x <= first.x) return first.y
      const segment = segments.find(({ to }) => x <= to.x)
      if (!segment) return last.y
      const { from, to, c1, c2 } = segment
      const t = (x - from.x) / (to.x - from.x)
      if (!contour.smooth) return from.y + (to.y - from.y) * t
      const u = 1 - t
      return u ** 3 * from.y + 3 * u ** 2 * t * c1 + 3 * u * t ** 2 * c2 + t ** 3 * to.y
    },
  }
}

function readPaint(value: unknown): Paint {
  if (record(value) && value.kind === 'gradient') {
    return {
      kind: 'gradient',
      from: pick(COMPOSED_EDGE_ROLES, value.from) ?? 'accent',
      to: pick(COMPOSED_EDGE_ROLES, value.to) ?? 'accent-2',
      fadeEnds: value.fadeEnds !== false,
    }
  }
  return {
    kind: 'solid',
    colour: (record(value) && pick(COMPOSED_EDGE_ROLES, value.colour)) || 'accent',
  }
}

function readCentre(value: unknown): Centre | undefined {
  if (!record(value)) return undefined
  if (value.kind === 'icon') {
    const icon = BADGE_ICONS.find((item) => item.value === value.icon)
    return icon ? { kind: 'icon', icon: icon.value } : undefined
  }
  if (
    value.kind === 'image' &&
    record(value.image) &&
    record(value.image.asset) &&
    typeof value.image.asset._id === 'string' &&
    /^image-[\w-]+-\d+x\d+-[a-z\d]+$/i.test(value.image.asset._id)
  ) {
    return { kind: 'image', image: { asset: { _id: value.image.asset._id } } }
  }
  return undefined
}

/** Invalid topology and unknown versions keep the old edge. An unavailable centre leaves an unbroken rule. */
export function resolveComposedEdge(value: unknown): ResolvedComposedEdge | undefined {
  if (!record(value) || value.version !== 1) return undefined
  const mode = pick(COMPOSED_EDGE_MODES, value.mode)
  const contour = readContour(value.contour)
  if (!mode || !contour) return undefined
  const layers: unknown = value.layers ?? []
  if (!Array.isArray(layers) || layers.length > COMPOSED_EDGE_MAX_LAYERS) return undefined
  const keys = new Set<string>()
  const compiledLayers: ResolvedComposedEdge['layers'] = []
  for (const layer of layers as unknown[]) {
    if (!record(layer)) return undefined
    if (typeof layer._key === 'string') {
      if (keys.has(layer._key)) return undefined
      keys.add(layer._key)
    }
    const placement = pick(COMPOSED_EDGE_PLACEMENTS, layer.placement)
    const geometry = layer.contour == null ? contour : readContour(layer.contour)
    if (!placement || !geometry) return undefined
    const opacity = bounded(layer.opacity, 0, 100, 100) / 100
    if (opacity) {
      compiledLayers.push({
        key:
          typeof layer._key === 'string' ? `saved-${layer._key}` : `paint-${compiledLayers.length}`,
        placement,
        opacity,
        paint: readPaint(layer.paint),
        path: compile(
          geometry,
          bounded(layer.offsetX, -8, 8, 0),
          bounded(layer.offsetY, -30, 30, 0),
        ).path,
        strokeWidth: bounded(layer.strokeWidth, 1, 6, 2),
      })
    }
  }

  const cut = compile(contour)
  const width = bounded(value.width, 5, 100, 100) / 100
  const align = pick(COMPOSED_EDGE_ALIGNS, value.align) ?? 'center'
  const start = align === 'start' ? 0 : align === 'end' ? 1 - width : (1 - width) / 2
  const x = start + width / 2
  const centre = readCentre(value.centre)
  const gap = record(value.centre) ? bounded(value.centre.gap, 10, 60, 22) / 100 : 0
  const shadow = mode === 'transition' && record(value.shadow) ? value.shadow : undefined
  const opacity = shadow ? bounded(shadow.opacity, 0, 65, 28) / 100 : 0
  return {
    shape: 'composed',
    mode,
    cut: cut.path,
    height: { kind: 'token', size: pick(COMPOSED_EDGE_HEIGHTS, value.height) ?? 'medium' },
    span: { start, end: start + width },
    layers: compiledLayers,
    ...(centre && compiledLayers.length
      ? { centre: { ...centre, x, y: cut.yAt(x), gap: width * gap } }
      : {}),
    ...(shadow && opacity
      ? {
          shadow: {
            blur: bounded(shadow.blur, 1, 23, 8) / 100,
            distance: bounded(shadow.distance, 0, 25, 8) / 100,
            opacity,
          },
        }
      : {}),
  }
}
