import { Button, Flex, Text } from '@sanity/ui'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import {
  addPoint,
  cannotAddPoint,
  cannotRemovePoint,
  movePoint,
  removePoint,
  type EdgeContour,
} from '@/lib/sanity/composed-edge-editor'

import { ChoiceRow, NumberCell } from './controls'

const W = 300
const H = 120

/**
 * One contour: a pad with a draggable handle for each point, and below it the same points as numbers. The
 * handles take the arrow keys (1%, Shift 5%) and Delete; the numbers and the Add and Remove buttons do
 * everything a drag does, so the contour never needs a pointer. Moves go through the model's `movePoint`, which
 * keeps the ends at the left and right and every point 4% clear of its neighbours, so the contour cannot become
 * one the page refuses to draw.
 */
export function ContourEditor({
  contour,
  label,
  control,
  readOnly,
  onChange,
}: {
  contour: EdgeContour
  label: string
  control: string
  readOnly?: boolean
  onChange: (contour: EdgeContour) => void
}) {
  const pad = useRef<SVGSVGElement>(null)
  const dragging = useRef<number | null>(null)
  const points = contour.points
  const noAdd = cannotAddPoint(contour)
  const at = (event: PointerEvent) => {
    const box = pad.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return undefined
    return {
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    }
  }
  const key = (index: number) => (event: KeyboardEvent) => {
    const point = points[index]
    if (!point || readOnly) return
    const step = event.shiftKey ? 5 : 1
    const moves: Record<string, [number, number] | undefined> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      onChange(movePoint(contour, index, point.x + move[0], point.y + move[1]))
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      if (!cannotRemovePoint(contour, index)) onChange(removePoint(contour, index))
    }
  }

  return (
    <div data-edge-control={control} style={{ display: 'grid', gap: 8 }}>
      <Text size={1} weight="medium">
        {label}
      </Text>
      <svg
        ref={pad}
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        width="100%"
        style={{
          display: 'block',
          touchAction: 'none',
          background: 'rgba(127,127,127,0.1)',
          borderRadius: 4,
        }}
        onPointerMove={(event) => {
          const index = dragging.current
          const to = at(event)
          if (index === null || !to || readOnly) return
          onChange(movePoint(contour, index, to.x, to.y))
        }}
        onPointerUp={() => {
          dragging.current = null
        }}
        onPointerCancel={() => {
          dragging.current = null
        }}
      >
        <polyline
          points={points
            .map((p) => `${String((p.x / 100) * W)},${String((p.y / 100) * H)}`)
            .join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {points.map((p, index) => (
          <circle
            key={p._key}
            data-edge-handle={index}
            cx={(p.x / 100) * W}
            cy={(p.y / 100) * H}
            r={8}
            tabIndex={readOnly ? -1 : 0}
            role="slider"
            aria-label={`${label}, point ${String(index + 1)} of ${String(points.length)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p.y}
            aria-valuetext={`${String(p.x)}% across, ${String(p.y)}% down. Arrow keys move it${cannotRemovePoint(contour, index) ? '' : '; Delete removes it'}.`}
            aria-orientation="vertical"
            fill="currentColor"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: readOnly ? 'default' : 'grab' }}
            onPointerDown={(event) => {
              if (readOnly) return
              dragging.current = index
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onKeyDown={key(index)}
          />
        ))}
      </svg>
      <Text size={1} muted>
        Drag a point, or focus it and use the arrow keys. The first and last points stay at the left
        and right edges.
      </Text>
      <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left', fontWeight: 500 }}>
              Point
            </th>
            <th scope="col" style={{ textAlign: 'left', fontWeight: 500 }}>
              Across %
            </th>
            <th scope="col" style={{ textAlign: 'left', fontWeight: 500 }}>
              Down %
            </th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {points.map((p, index) => {
            const pinned = Boolean(cannotRemovePoint(contour, index))
            return (
              <tr key={p._key}>
                <td>{index + 1}</td>
                <td>
                  <NumberCell
                    label={`${label}, point ${String(index + 1)} across`}
                    value={p.x}
                    min={0}
                    max={100}
                    disabled={readOnly === true || index === 0 || index === points.length - 1}
                    onChange={(x) => {
                      onChange(movePoint(contour, index, x, p.y))
                    }}
                  />
                </td>
                <td>
                  <NumberCell
                    label={`${label}, point ${String(index + 1)} down`}
                    value={p.y}
                    min={0}
                    max={100}
                    disabled={readOnly}
                    onChange={(y) => {
                      onChange(movePoint(contour, index, p.x, y))
                    }}
                  />
                </td>
                <td>
                  <Button
                    type="button"
                    mode="bleed"
                    fontSize={1}
                    padding={2}
                    text="Remove"
                    aria-label={`Remove ${label} point ${String(index + 1)}`}
                    disabled={readOnly === true || pinned}
                    onClick={() => {
                      onChange(removePoint(contour, index))
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Flex gap={3} align="center" wrap="wrap">
        <Button
          type="button"
          mode="ghost"
          fontSize={1}
          padding={2}
          text="Add a point"
          disabled={readOnly === true || Boolean(noAdd)}
          onClick={() => {
            onChange(addPoint(contour))
          }}
        />
        {noAdd && (
          <Text size={1} muted>
            {noAdd}
          </Text>
        )}
      </Flex>
      <ChoiceRow
        legend="Line between points"
        control={`${control}-interpolation`}
        value={contour.interpolation === 'linear' ? 'linear' : 'smooth'}
        options={[
          { value: 'smooth', label: 'Smooth' },
          { value: 'linear', label: 'Straight' },
        ]}
        disabled={readOnly}
        onChange={(interpolation) => {
          onChange({ ...contour, interpolation })
        }}
      />
    </div>
  )
}
