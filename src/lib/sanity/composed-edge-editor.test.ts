import { describe, expect, it } from 'vitest'

import { resolveComposedEdge } from './composed-edge'
import {
  addLayer,
  addPoint,
  cannotAddLayer,
  cannotAddPoint,
  cannotRemovePoint,
  contourOf,
  copyEdge,
  describeEdge,
  edgeProblems,
  movePoint,
  moveLayer,
  removeLayer,
  removePoint,
  setIndependentContour,
  startingEdge,
  type EdgeValue,
} from './composed-edge-editor'

/** One sequence for the whole file, so no two calls ever hand out the same key. */
let n = 0
const counter = () => () => `k${String((n += 1)).padStart(4, '0')}`
const base = () => startingEdge(counter())

describe('the starting design', () => {
  it('draws, with layered contours, a gradient, a shadow and only site colour roles', () => {
    const value = base()
    const resolved = resolveComposedEdge(value)
    expect(resolved?.mode).toBe('transition')
    expect(resolved?.layers.map((l) => l.placement)).toEqual(['above', 'stroke'])
    expect(resolved?.layers[1]?.paint.kind).toBe('gradient')
    expect(resolved?.shadow).toBeDefined()
    expect(edgeProblems(value)).toEqual([])
  })

  it('gives the tint a contour of its own and has no centre until one is chosen', () => {
    const value = base()
    expect(value.layers?.[0]?.contour?.points).toHaveLength(3)
    expect(value.centre).toBeUndefined()
  })

  it('types every array member, as Studio needs for the named object types', () => {
    const value = base()
    expect(value.contour.points.every((p) => Boolean(p._key))).toBe(true)
    expect(JSON.stringify(value)).toContain('"_type":"contourPoint"')
    expect(JSON.stringify(value)).toContain('"_type":"edgePaintLayer"')
  })
})

describe('moving points', () => {
  it('pins the ends to the left and right edges but lets them move vertically', () => {
    const moved = movePoint(movePoint(base().contour, 0, 50, 10), 3, 20, 90)
    expect(moved.points[0]).toMatchObject({ x: 0, y: 10 })
    expect(moved.points[3]).toMatchObject({ x: 100, y: 90 })
  })

  it('keeps an interior point 4% clear of its neighbours', () => {
    const contour = base().contour // x: 0, 32, 66, 100
    expect(movePoint(contour, 1, 99, 40).points[1]?.x).toBe(62)
    expect(movePoint(contour, 1, -5, 40).points[1]?.x).toBe(4)
  })

  it('keeps y inside the band and ignores a point that is not there', () => {
    expect(movePoint(base().contour, 1, 32, 250).points[1]?.y).toBe(100)
    const contour = base().contour
    expect(movePoint(contour, 9, 1, 1)).toBe(contour)
  })

  it('always leaves a contour the resolver accepts', () => {
    let value = base()
    for (const [index, x, y] of [
      [1, 0, 0],
      [2, 100, 100],
      [1, 200, -4],
      [2, 3, 50],
    ] as const) {
      value = { ...value, contour: movePoint(value.contour, index, x, y) }
      expect(edgeProblems(value)).toEqual([])
      expect(resolveComposedEdge(value)).toBeDefined()
    }
  })
})

describe('adding and removing points', () => {
  it('adds a point in the widest gap, on the line already there', () => {
    const value = base()
    const added = addPoint(value.contour, counter())
    expect(added.points.map((p) => p.x)).toEqual(
      [0, 32, 49, 66, 100].slice(0, 5).sort((a, b) => a - b),
    )
  })

  it('stops at seven points and says why', () => {
    let contour = contourOf(
      [
        [0, 50],
        [100, 50],
      ],
      counter(),
    )
    for (let i = 0; i < 12; i += 1) contour = addPoint(contour, counter())
    expect(contour.points).toHaveLength(7)
    expect(cannotAddPoint(contour)).toMatch(/at most 7/)
    expect(addPoint(contour)).toBe(contour)
    expect(edgeProblems({ ...base(), contour })).toEqual([])
  })

  it('says there is no room when every gap is under 8%', () => {
    const crowded = contourOf(
      [
        [0, 1],
        [6, 1],
        [12, 1],
        [100, 1],
      ],
      counter(),
    )
    // The widest gap (12 to 100) has room, so a point can still be added.
    expect(cannotAddPoint(crowded)).toBeUndefined()
    const tight = {
      ...crowded,
      points: crowded.points.map((p, i) => ({ ...p, x: [0, 5, 10, 14][i] ?? 0 })),
    }
    expect(cannotAddPoint(tight)).toMatch(/no room/)
    expect(addPoint(tight)).toBe(tight)
  })

  it('removes an interior point and never an end', () => {
    const contour = base().contour
    expect(removePoint(contour, 1).points.map((p) => p.x)).toEqual([0, 66, 100])
    expect(cannotRemovePoint(contour, 0)).toMatch(/stay at the left and right/)
    expect(removePoint(contour, 3)).toBe(contour)
  })
})

describe('layers', () => {
  it('adds up to three and says why a fourth cannot be added', () => {
    let value = base()
    expect(cannotAddLayer(value)).toBeUndefined()
    value = addLayer(value, counter())
    expect(value.layers).toHaveLength(3)
    expect(cannotAddLayer(value)).toMatch(/at most 3/)
    expect(addLayer(value)).toBe(value)
    expect(edgeProblems(value)).toEqual([])
  })

  it('removes a layer, and the edge still draws with none', () => {
    let value = base()
    value = removeLayer(removeLayer(value, 0), 0)
    expect(value.layers).toEqual([])
    expect(resolveComposedEdge(value)?.layers).toEqual([])
    expect(resolveComposedEdge(value)?.cut).toBeTruthy()
  })

  it('reorders: a later layer draws in front', () => {
    const value = base()
    const moved = moveLayer(value, 0, 1)
    expect(moved.layers?.map((l) => l.placement)).toEqual(['stroke', 'above'])
    expect(moveLayer(value, 0, -1)).toBe(value)
  })

  it('gives a layer its own contour and takes it back to the shared one', () => {
    let value = base()
    value = setIndependentContour(value, 1, true, counter())
    expect(value.layers?.[1]?.contour?.points).toHaveLength(4)
    expect(value.layers?.[1]?.contour?.points[0]?._key).not.toBe(value.contour.points[0]?._key)
    value = setIndependentContour(value, 1, false)
    expect(value.layers?.[1]).not.toHaveProperty('contour')
    expect(edgeProblems(value)).toEqual([])
  })
})

describe('copying', () => {
  it('copies independently, with fresh keys, so a later edit to either cannot reach the other', () => {
    const original = base()
    const copy = copyEdge(original, counter())
    expect(copy.mode).toBe(original.mode)
    expect(copy.layers).toHaveLength(original.layers?.length ?? 0)
    expect(copy.shadow).toEqual(original.shadow)
    const keys = (v: EdgeValue) => [
      ...v.contour.points.map((p) => p._key),
      ...(v.layers ?? []).flatMap((l) => [l._key, ...(l.contour?.points ?? []).map((p) => p._key)]),
    ]
    expect(keys(copy).filter((k) => keys(original).includes(k))).toEqual([])
    const edited = { ...copy, contour: movePoint(copy.contour, 1, 40, 10) }
    expect(original.contour.points[1]?.y).toBe(42)
    expect(edited.contour.points[1]?.y).toBe(10)
    const moved = movePoint(original.contour, 1, 20, 5)
    expect(copy.contour.points[1]?.x).toBe(32)
    expect(moved.points[1]?.x).toBe(20)
  })

  it('keeps a centre image reference and a design that has none', () => {
    const withImage = {
      ...base(),
      centre: { kind: 'image' as const, gap: 20, image: { asset: { _ref: 'image-a-2x2-png' } } },
    }
    expect(copyEdge(withImage, counter()).centre).toEqual(withImage.centre)
    expect(copyEdge(base(), counter())).not.toHaveProperty('centre')
  })
})

describe('edgeProblems', () => {
  it('says nothing for nothing stored', () => {
    expect(edgeProblems(undefined)).toEqual([])
    expect(edgeProblems(null)).toEqual([])
  })

  const broken = (change: (value: Record<string, unknown>) => void) => {
    const value = JSON.parse(JSON.stringify(base())) as Record<string, unknown>
    change(value)
    return value
  }

  it.each([
    ['another version', (v: Record<string, unknown>) => (v.version = 2), 'reset'],
    ['a missing mode', (v: Record<string, unknown>) => delete v.mode, 'mode'],
    [
      'points too close',
      (v: Record<string, unknown>) => {
        ;((v.contour as { points: { x: number }[] }).points[1] as { x: number }).x = 2
      },
      'contour',
    ],
    [
      'an end off the edge',
      (v: Record<string, unknown>) => {
        ;((v.contour as { points: { x: number }[] }).points[0] as { x: number }).x = 5
      },
      'contour',
    ],
    [
      'too many layers',
      (v: Record<string, unknown>) =>
        (v.layers as unknown[]).push({ placement: 'above' }, { placement: 'above' }),
      'layers',
    ],
    [
      'a layer with no placement',
      (v: Record<string, unknown>) => delete (v.layers as Record<string, unknown>[])[0]?.placement,
      'layer-0-placement',
    ],
    [
      'a self-crossing layer contour',
      (v: Record<string, unknown>) => {
        ;(
          (v.layers as { contour: { points: { x: number }[] } }[])[0]?.contour.points[1] as {
            x: number
          }
        ).x = 1
      },
      'layer-0-contour',
    ],
  ])(
    'names the control that fixes %s, and the resolver agrees it would not draw',
    (_name, change, control) => {
      const value = broken(change)
      const problems = edgeProblems(value)
      expect(problems.map((p) => p.control)).toContain(control)
      expect(problems.every((p) => p.message.length > 10)).toBe(true)
      expect(resolveComposedEdge(value)).toBeUndefined()
    },
  )

  it('is empty exactly when the composition draws, over a battery of stored values', () => {
    const good = base()
    const values: unknown[] = [
      good,
      { ...good, width: 200, shadow: { blur: 999, distance: -4, opacity: 400 } },
      { ...good, layers: undefined },
      { ...good, mode: 'rule' },
      { ...good, mode: 'wavy' },
      { ...good, version: 2 },
      { ...good, contour: { points: [{ x: 0, y: 1 }] } },
      { ...good, contour: { ...good.contour, interpolation: 'spline' } },
      { ...good, layers: 'none' },
      { ...good, layers: [null] },
      { ...good, layers: [{ placement: 'under' }] },
      [],
      'edge',
    ]
    for (const value of values) {
      expect(edgeProblems(value).length === 0, JSON.stringify(value).slice(0, 80)).toBe(
        resolveComposedEdge(value) !== undefined,
      )
    }
  })
})

describe('describeEdge', () => {
  it('summarises in plain words', () => {
    expect(describeEdge(base())).toBe('Transition · Large · 2 layers · shadow')
    expect(
      describeEdge({
        ...base(),
        mode: 'rule',
        height: 'small',
        layers: [],
        shadow: undefined,
        centre: { kind: 'icon' },
      }),
    ).toBe('Rule · Small · 0 layers · centre icon')
  })
})
