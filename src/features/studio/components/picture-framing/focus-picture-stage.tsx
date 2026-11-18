import { ArrowDownIcon } from '@sanity/icons/ArrowDown'
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft'
import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { ArrowUpIcon } from '@sanity/icons/ArrowUp'
import { Button, Flex, Text } from '@sanity/ui'
import { useId, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

import { stepFocus, type Focus } from '@/lib/sanity/image-focus'

/** WCAG 2.5.8: 44 px targets for the controls that stand in for dragging. */
const TARGET: CSSProperties = { minWidth: 44, minHeight: 44 }

const MOVES = [
  { direction: 'up', label: 'Move focus up', icon: ArrowUpIcon },
  { direction: 'left', label: 'Move focus left', icon: ArrowLeftIcon },
  { direction: 'right', label: 'Move focus right', icon: ArrowRightIcon },
  { direction: 'down', label: 'Move focus down', icon: ArrowDownIcon },
] as const

const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
} as const

const percent = (value: number) => `${Math.round(value * 100)}%`

export interface FocusPictureStageProps {
  /** The picture as the page serves it (cut to its crop), and its width over height. */
  previewUrl: string
  aspect: number
  lqip?: string
  /** Where the focus is; undefined is the centre, not yet chosen. */
  focus: Focus | undefined
  onChange: (focus: Focus) => void
  readOnly?: boolean
  onError: () => void
}

/**
 * The whole picture with its focus point: click or drag to put the point on what must stay in view, or move
 * it with the arrow keys (Shift for further) or the four buttons. Only the point moves, never the picture. A
 * shared Focus mode primitive (task 177): any covering background uses it with its own frames.
 */
export function FocusPictureStage({
  previewUrl,
  aspect,
  lqip,
  focus,
  onChange,
  readOnly,
  onError,
}: FocusPictureStageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const dragging = useRef(false)
  const at = focus ?? { x: 0.5, y: 0.5 }

  const place = (event: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return
    onChange({
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return
    if (!Object.hasOwn(KEYS, event.key)) return
    const direction = KEYS[event.key as keyof typeof KEYS]
    event.preventDefault()
    onChange(stepFocus(at, direction, event.shiftKey))
  }

  const stageProps = {
    onKeyDown,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (readOnly) return
      dragging.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      place(event)
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (dragging.current) place(event)
    },
    onPointerUp: () => {
      dragging.current = false
    },
    onPointerCancel: () => {
      dragging.current = false
    },
  }

  return (
    <>
      <div
        ref={boxRef}
        role="group"
        aria-label="Focus point"
        aria-describedby={hintId}
        tabIndex={readOnly ? -1 : 0}
        data-focus-stage=""
        {...stageProps}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: String(aspect),
          overflow: 'hidden',
          cursor: readOnly ? 'default' : 'crosshair',
          touchAction: 'none',
          backgroundImage: lqip ? `url("${lqip}")` : undefined,
          backgroundSize: '100% 100%',
          borderRadius: 3,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          draggable={false}
          onError={onError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        {focus ? (
          <span
            aria-hidden="true"
            data-focus-marker=""
            style={{
              position: 'absolute',
              left: percent(at.x),
              top: percent(at.y),
              width: 28,
              height: 28,
              marginLeft: -14,
              marginTop: -14,
              borderRadius: '50%',
              // The point reads over any photo: a light ring inside a dark one.
              boxShadow: '0 0 0 2px #fff, 0 0 0 4px #000',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
      <Text id={hintId} size={1} muted>
        {readOnly
          ? 'This picture’s focus can’t be changed here.'
          : focus
            ? `Focus ${percent(at.x)} across, ${percent(at.y)} down. Click or drag the picture, or use the arrow keys.`
            : 'Centred. Click or drag the picture to choose what must stay in view.'}
      </Text>
      {readOnly ? null : (
        <Flex role="group" aria-label="Move focus" gap={2} wrap="wrap">
          {MOVES.map(({ direction, label, icon }) => (
            <Button
              key={direction}
              icon={icon}
              mode="ghost"
              aria-label={label}
              style={TARGET}
              onClick={() => {
                onChange(stepFocus(at, direction))
              }}
            />
          ))}
        </Flex>
      )}
    </>
  )
}
