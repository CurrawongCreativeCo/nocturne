import {
  COMPOSED_EDGE_INTERPOLATIONS,
  COMPOSED_EDGE_MAX_LAYERS,
  COMPOSED_EDGE_MAX_POINTS,
  COMPOSED_EDGE_PLACEMENTS,
  COMPOSED_EDGE_POINT_GAP,
  resolveComposedEdge,
} from './composed-edge'

/**
 * The Section edge editor's model (composable section edges, Task 2). Every function here takes the stored
 * `sectionStyle.composedEdge` value and returns a new one that `resolveComposedEdge` (the resolver the page and
 * Preview use) accepts, so the editor cannot write a composition that quietly falls back to the saved shape.
 * The editor is the only writer; hand-edited or imported data is judged by `edgeProblems`, which names the
 * control that fixes each problem.
 */

export interface EdgePoint {
  _key: string
  _type: 'contourPoint'
  x: number
  y: number
}
export interface EdgeContour {
  interpolation?: string
  points: EdgePoint[]
}
export interface EdgePaint {
  kind: 'solid' | 'gradient'
  colour?: string
  from?: string
  to?: string
  fadeEnds?: boolean
}
export interface EdgeLayer {
  _key: string
  _type: 'edgePaintLayer'
  placement: string
  contour?: EdgeContour
  offsetX?: number
  offsetY?: number
  opacity?: number
  strokeWidth?: number
  paint?: EdgePaint
}
export interface EdgeCentre {
  kind?: 'icon' | 'image'
  gap?: number
  icon?: string
  image?: unknown
}
export interface EdgeShadow {
  blur?: number
  distance?: number
  opacity?: number
}
export interface EdgeValue {
  version: 1
  mode: 'transition' | 'rule'
  height?: string
  width?: number
  align?: string
  contour: EdgeContour
  layers?: EdgeLayer[]
  centre?: EdgeCentre
  shadow?: EdgeShadow
}

/** A named site design: an independent copy of an edge, kept in Design settings. */
export interface EdgeDesign {
  _key: string
  _type: 'edgeDesign'
  name: string
  edge: EdgeValue
}

export type KeyMaker = () => string

/** A Sanity array key: unique within its array, so a short random string is enough. */
export const newKey: KeyMaker = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0')

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number) => Math.round(value * 10) / 10

const point = (x: number, y: number, key: KeyMaker): EdgePoint => ({
  _key: key(),
  _type: 'contourPoint',
  x: round(x),
  y: round(y),
})

export function contourOf(points: [number, number][], key: KeyMaker = newKey): EdgeContour {
  return { interpolation: 'smooth', points: points.map(([x, y]) => point(x, y, key)) }
}

const layer = (placement: string, extra: Partial<EdgeLayer>, key: KeyMaker): EdgeLayer => ({
  _key: key(),
  _type: 'edgePaintLayer',
  placement,
  ...extra,
})

/**
 * The design a new edge starts with: an asymmetric rolling cut, a soft tint behind it that follows its own
 * contour, a fine gradient line along the cut, and a gentle shadow. It uses only site colour roles, so it
 * suits any palette, and it has no centre, because a centre needs an icon or an image the editor picks.
 */
export function startingEdge(key: KeyMaker = newKey): EdgeValue {
  return {
    version: 1,
    mode: 'transition',
    height: 'large',
    width: 100,
    align: 'center',
    contour: contourOf(
      [
        [0, 72],
        [32, 42],
        [66, 78],
        [100, 48],
      ],
      key,
    ),
    layers: [
      layer(
        'above',
        {
          contour: contourOf(
            [
              [0, 38],
              [48, 62],
              [100, 30],
            ],
            key,
          ),
          opacity: 40,
          paint: { kind: 'solid', colour: 'accent' },
        },
        key,
      ),
      layer(
        'stroke',
        {
          opacity: 100,
          strokeWidth: 3,
          paint: { kind: 'gradient', from: 'accent', to: 'accent-2', fadeEnds: true },
        },
        key,
      ),
    ],
    shadow: { blur: 6, distance: 8, opacity: 28 },
  }
}

/** A copy with fresh keys, so two sections (or a section and a design) never share an array member. */
export function copyEdge(value: EdgeValue, key: KeyMaker = newKey): EdgeValue {
  const contour = (source: EdgeContour): EdgeContour => ({
    ...source,
    points: source.points.map((p) => ({ ...p, _key: key() })),
  })
  return {
    ...structuredClone(value),
    contour: contour(value.contour),
    ...(value.layers
      ? {
          layers: value.layers.map((item) => ({
            ...structuredClone(item),
            _key: key(),
            ...(item.contour ? { contour: contour(item.contour) } : {}),
          })),
        }
      : {}),
  }
}

// --- contours --------------------------------------------------------------------------------------------------

/** Move a point. The ends stay pinned to the left and right edges; the others keep clear of their neighbours. */
export function movePoint(contour: EdgeContour, index: number, x: number, y: number): EdgeContour {
  const points = contour.points
  const current = points[index]
  if (!current) return contour
  const last = index === points.length - 1
  const pinned = index === 0 || last
  const low = pinned ? current.x : (points[index - 1]?.x ?? 0) + COMPOSED_EDGE_POINT_GAP
  const high = pinned ? current.x : (points[index + 1]?.x ?? 100) - COMPOSED_EDGE_POINT_GAP
  const next = { ...current, x: round(clamp(x, low, high)), y: round(clamp(y, 0, 100)) }
  return { ...contour, points: points.map((item, at) => (at === index ? next : item)) }
}

/** Where the contour crosses x, along straight segments (close enough for placing a new point). */
function lineAt(points: EdgePoint[], x: number): number {
  const after = points.findIndex((p) => p.x >= x)
  const to = points[after] ?? points.at(-1)
  const from = points[Math.max(0, after - 1)] ?? points[0]
  if (!to || !from || to.x === from.x) return to?.y ?? 50
  return from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x)
}

/** Why a point cannot be added, or undefined when one can. */
export function cannotAddPoint(contour: EdgeContour): string | undefined {
  if (contour.points.length >= COMPOSED_EDGE_MAX_POINTS)
    return `A contour has at most ${String(COMPOSED_EDGE_MAX_POINTS)} points.`
  return widestGap(contour.points).width < COMPOSED_EDGE_POINT_GAP * 2
    ? 'There is no room: points must stay at least 4% apart.'
    : undefined
}

function widestGap(points: EdgePoint[]) {
  let best = { index: 0, width: 0 }
  for (let index = 1; index < points.length; index++) {
    const width = (points[index]?.x ?? 0) - (points[index - 1]?.x ?? 0)
    if (width > best.width) best = { index, width }
  }
  return best
}

/** Add a point in the middle of the widest gap, on the line already there, so the shape does not jump. */
export function addPoint(contour: EdgeContour, key: KeyMaker = newKey): EdgeContour {
  if (cannotAddPoint(contour)) return contour
  const { index } = widestGap(contour.points)
  const before = contour.points[index - 1]
  const after = contour.points[index]
  if (!before || !after) return contour
  const x = (before.x + after.x) / 2
  const added = point(x, lineAt(contour.points, x), key)
  return {
    ...contour,
    points: [...contour.points.slice(0, index), added, ...contour.points.slice(index)],
  }
}

/** The ends cannot be removed, and a contour keeps at least two points. */
export function cannotRemovePoint(contour: EdgeContour, index: number): string | undefined {
  if (index <= 0 || index >= contour.points.length - 1)
    return 'The first and last points stay at the left and right edges.'
  return undefined
}

export function removePoint(contour: EdgeContour, index: number): EdgeContour {
  if (cannotRemovePoint(contour, index)) return contour
  return { ...contour, points: contour.points.filter((_, at) => at !== index) }
}

// --- layers ----------------------------------------------------------------------------------------------------

export function cannotAddLayer(value: EdgeValue): string | undefined {
  return (value.layers?.length ?? 0) >= COMPOSED_EDGE_MAX_LAYERS
    ? `An edge has at most ${String(COMPOSED_EDGE_MAX_LAYERS)} paint layers.`
    : undefined
}

export function addLayer(value: EdgeValue, key: KeyMaker = newKey): EdgeValue {
  if (cannotAddLayer(value)) return value
  const added = layer('above', { opacity: 30, paint: { kind: 'solid', colour: 'accent-2' } }, key)
  return { ...value, layers: [...(value.layers ?? []), added] }
}

export function removeLayer(value: EdgeValue, index: number): EdgeValue {
  return { ...value, layers: (value.layers ?? []).filter((_, at) => at !== index) }
}

/** Later layers draw in front within a placement; this swaps one with its neighbour. */
export function moveLayer(value: EdgeValue, index: number, by: -1 | 1): EdgeValue {
  const layers = [...(value.layers ?? [])]
  const to = index + by
  const from = layers[index]
  const other = layers[to]
  if (!from || !other) return value
  layers[index] = other
  layers[to] = from
  return { ...value, layers }
}

export function updateLayer(
  value: EdgeValue,
  index: number,
  change: Partial<EdgeLayer>,
): EdgeValue {
  return {
    ...value,
    layers: (value.layers ?? []).map((item, at) => (at === index ? { ...item, ...change } : item)),
  }
}

/** Give a layer its own copy of the shared contour (so it can differ), or take it back to following it. */
export function setIndependentContour(
  value: EdgeValue,
  index: number,
  independent: boolean,
  key: KeyMaker = newKey,
): EdgeValue {
  const target = value.layers?.[index]
  if (!target) return value
  const { contour: _dropped, ...rest } = target
  const next: EdgeLayer = independent ? { ...rest, contour: copyEdge(value, key).contour } : rest
  return { ...value, layers: value.layers?.map((item, at) => (at === index ? next : item)) }
}

// --- judging a stored value ------------------------------------------------------------------------------------

/** One reason a stored composition would not draw, and the control (by its `data-edge-control`) that fixes it. */
export interface EdgeProblem {
  control: string
  message: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function contourProblems(value: unknown, control: string, label: string): EdgeProblem[] {
  const fix = (message: string): EdgeProblem[] => [{ control, message: `${label}: ${message}` }]
  if (!isRecord(value) || !Array.isArray(value.points)) return fix('add its points again.')
  const points: unknown[] = value.points
  if (points.length < 2 || points.length > COMPOSED_EDGE_MAX_POINTS)
    return fix(`use 2 to ${String(COMPOSED_EDGE_MAX_POINTS)} points.`)
  let lastX: number | undefined
  const keys = new Set<string>()
  for (const [index, p] of points.entries()) {
    const at = `point ${String(index + 1)}`
    if (!isRecord(p) || typeof p.x !== 'number' || typeof p.y !== 'number')
      return fix(`${at} has no position.`)
    if (!(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100))
      return fix(`${at} is outside the band (0 to 100).`)
    if (lastX !== undefined && p.x - lastX < COMPOSED_EDGE_POINT_GAP)
      return fix(`${at} is closer than ${String(COMPOSED_EDGE_POINT_GAP)}% to the one before it.`)
    if (typeof p._key === 'string') {
      if (keys.has(p._key)) return fix(`${at} repeats another point’s key.`)
      keys.add(p._key)
    }
    lastX = p.x
  }
  const first = points[0]
  const final = points.at(-1)
  if (!isRecord(first) || first.x !== 0 || !isRecord(final) || final.x !== 100)
    return fix('the first point must be at the left edge and the last at the right.')
  if (
    value.interpolation != null &&
    !COMPOSED_EDGE_INTERPOLATIONS.some((option) => option === value.interpolation)
  )
    return fix('choose Straight or Smooth.')
  return []
}

/**
 * Everything that would make `resolveComposedEdge` refuse a stored value, each with the control that fixes it.
 * Empty exactly when the composition draws (the tests hold the two together); values the resolver only
 * clamps (a width of 200) are not problems here.
 */
export function edgeProblems(value: unknown): EdgeProblem[] {
  if (value == null) return []
  if (!isRecord(value) || value.version !== 1)
    return [
      {
        control: 'reset',
        message: 'This edge was saved by a different version. Reset it to the starting design.',
      },
    ]
  const problems: EdgeProblem[] = []
  if (value.mode !== 'transition' && value.mode !== 'rule')
    problems.push({ control: 'mode', message: 'Choose whether this is a transition or a rule.' })
  problems.push(...contourProblems(value.contour, 'contour', 'Contour'))
  const layers: unknown = value.layers ?? []
  if (!Array.isArray(layers)) {
    problems.push({ control: 'layers', message: 'Paint layers are not readable. Reset the edge.' })
    return problems
  }
  if (layers.length > COMPOSED_EDGE_MAX_LAYERS)
    problems.push({
      control: 'layers',
      message: `Use at most ${String(COMPOSED_EDGE_MAX_LAYERS)} paint layers.`,
    })
  const keys = new Set<string>()
  for (const [index, item] of (layers as unknown[]).entries()) {
    const control = `layer-${String(index)}`
    const name = `Layer ${String(index + 1)}`
    if (!isRecord(item)) {
      problems.push({ control, message: `${name} is not readable. Remove it.` })
      continue
    }
    if (typeof item._key === 'string') {
      if (keys.has(item._key))
        problems.push({ control, message: `${name} repeats another layer’s key. Remove it.` })
      keys.add(item._key)
    }
    if (!COMPOSED_EDGE_PLACEMENTS.some((option) => option === item.placement))
      problems.push({
        control: `${control}-placement`,
        message: `${name}: choose Above the cut, Below the cut or Line.`,
      })
    if (item.contour != null)
      problems.push(...contourProblems(item.contour, `${control}-contour`, `${name}’s own contour`))
  }
  return problems
}

/** The one-line description at the top of the editor. */
export function describeEdge(value: EdgeValue): string {
  const layers = value.layers?.length ?? 0
  const parts = [
    value.mode === 'rule' ? 'Rule' : 'Transition',
    value.height === 'small' ? 'Small' : value.height === 'large' ? 'Large' : 'Medium',
    layers === 1 ? '1 layer' : `${String(layers)} layers`,
  ]
  if (value.centre?.kind) parts.push(value.centre.kind === 'icon' ? 'centre icon' : 'centre image')
  if (value.shadow && (value.shadow.opacity ?? 28) > 0) parts.push('shadow')
  return parts.join(' · ')
}

/** Whether the composition draws, by the same resolver the page uses. */
export const edgeDraws = (value: unknown): boolean => resolveComposedEdge(value) !== undefined
