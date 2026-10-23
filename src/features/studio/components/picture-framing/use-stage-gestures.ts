import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

import {
  pan,
  stepPicture,
  stepZoom,
  zoomAt,
  type Direction,
  type FramingContext,
  type FramingState,
} from '@/lib/sanity/image-framing'

const ARROWS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

/** How much a ctrl + wheel notch (a trackpad pinch) zooms: a ratio per pixel of delta. */
const WHEEL_ZOOM = 0.01

interface Options {
  context: FramingContext
  state: FramingState
  /** Called at most once per frame with the latest state. */
  onChange: (next: FramingState) => void
  onReset: () => void
  disabled?: boolean
  /** The shape's box: gestures are measured against it. */
  boxRef: RefObject<HTMLElement | null>
  /** The element that takes the (non-passive) wheel listener. */
  stageRef: RefObject<HTMLElement | null>
}

/**
 * One pointer path for mouse, pen and touch: one pointer drags, two pinch (zoom about their
 * midpoint while following it), and ctrl + wheel (a trackpad pinch) zooms. A plain wheel never
 * takes over scrolling. Updates are batched to one per animation frame, and every listener and
 * frame request is removed on unmount.
 */
export function useStageGestures({
  context,
  state,
  onChange,
  onReset,
  disabled,
  boxRef,
  stageRef,
}: Options) {
  // The latest state, so several events in one frame build on each other.
  const latest = useRef(state)
  const frame = useRef<number | undefined>(undefined)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const options = useRef({ context, onChange, onReset, disabled })

  useEffect(() => {
    // A frame still pending holds the newer value.
    if (frame.current === undefined) latest.current = state
    options.current = { context, onChange, onReset, disabled }
  })

  const schedule = (next: FramingState) => {
    latest.current = next
    if (frame.current !== undefined) return
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined
      options.current.onChange(latest.current)
    })
  }

  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = undefined
    },
    [],
  )

  /** The box on screen; a 1 px box (no layout) keeps the maths finite. */
  const measure = () => {
    const rect = boxRef.current?.getBoundingClientRect()
    return {
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      width: Math.max(rect?.width ?? 1, 1),
      height: Math.max(rect?.height ?? 1, 1),
    }
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const onWheel = (event: WheelEvent) => {
      // A plain wheel scrolls the dialog as usual.
      if (!event.ctrlKey || options.current.disabled) return
      event.preventDefault()
      const box = measure()
      schedule(
        zoomAt(latest.current, options.current.context, Math.exp(-event.deltaY * WHEEL_ZOOM), {
          x: (event.clientX - box.left) / box.width,
          y: (event.clientY - box.top) / box.height,
        }),
      )
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
    }
    // `schedule` and `measure` only touch refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef])

  /** The midpoint of the pointers down (the one pointer's own position when there is one). */
  const centreOf = () => {
    const all = [...pointers.current.values()]
    return {
      x: all.reduce((sum, point) => sum + point.x, 0) / Math.max(all.length, 1),
      y: all.reduce((sum, point) => sum + point.y, 0) / Math.max(all.length, 1),
    }
  }
  /** The distance between the first two pointers; 0 with fewer. */
  const gapOf = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    const beforeCentre = centreOf()
    const beforeGap = gapOf()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const afterCentre = centreOf()
    const box = measure()

    let next = latest.current
    if (pointers.current.size >= 2 && beforeGap > 0) {
      next = zoomAt(next, context, gapOf() / beforeGap, {
        x: (beforeCentre.x - box.left) / box.width,
        y: (beforeCentre.y - box.top) / box.height,
      })
    }
    // Dragging moves the picture with the pointer: the box moves the other way.
    next = pan(
      next,
      context,
      -(afterCentre.x - beforeCentre.x) / box.width,
      -(afterCentre.y - beforeCentre.y) / box.height,
    )
    schedule(next)
  }

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if ('releasePointerCapture' in event.currentTarget) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const direction = ARROWS[event.key]
    if (direction) {
      schedule(stepPicture(latest.current, context, direction, event.shiftKey))
    } else if (event.key === '+' || event.key === '=') {
      schedule(stepZoom(latest.current, context, 1))
    } else if (event.key === '-' || event.key === '_') {
      schedule(stepZoom(latest.current, context, -1))
    } else if (event.key === '0') {
      onReset()
    } else {
      return
    }
    event.preventDefault()
  }

  return {
    stageProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onLostPointerCapture: onPointerEnd,
      onKeyDown,
    },
  }
}
