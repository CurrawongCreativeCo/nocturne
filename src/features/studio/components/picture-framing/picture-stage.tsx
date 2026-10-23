import { Card, Flex, Text } from '@sanity/ui'
import { useId, useRef, type CSSProperties } from 'react'

import { frameMaskUrl } from '@/lib/sanity/frame-mask'
import type { FrameShape } from '@/lib/sanity/image-frame-geometry'
import type { AssetSize, FramingContext, FramingState } from '@/lib/sanity/image-framing'

import {
  alsoShownOutline,
  cornerRadius,
  pictureStyle,
  shapeBox,
  shapeBoxStyle,
  STAGE_INSTRUCTIONS,
} from './shape-style'
import { useStageGestures } from './use-stage-gestures'

/** The picture's own colours, from Sanity UI's card tokens, so the outline reads over any photo. */
const OUTLINE = '0 0 0 2px var(--card-bg-color), 0 0 0 3px var(--card-fg-color)'

export interface PictureStageProps {
  /** The main shape: the picture is framed for it. */
  shape: FrameShape
  /** Other shapes the same picture is drawn in, as outlines. */
  others?: FrameShape[]
  size: AssetSize
  previewUrl: string
  lqip?: string
  state: FramingState
  context: FramingContext
  onChange: (next: FramingState) => void
  onReset: () => void
  readOnly?: boolean
  onError: () => void
}

/**
 * The picture inside the exact shape the site draws it in, with the picture beyond the shape
 * dimmed. The stage takes pointer, touch, wheel (ctrl) and keyboard input; the picture only
 * ever moves with a transform. Other shapes the picture is also drawn in are thin outlines.
 */
export function PictureStage({
  shape: main,
  others = [],
  size,
  previewUrl,
  lqip,
  state,
  context,
  onChange,
  onReset,
  readOnly,
  onError,
}: PictureStageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const descriptionId = useId()
  const { stageProps } = useStageGestures({
    context,
    state,
    onChange,
    onReset,
    disabled: readOnly,
    boxRef,
    stageRef,
  })

  const box = shapeBox(main.aspect, main.insetPct)
  const boxStyle = shapeBoxStyle(main.aspect, main.insetPct)
  const radius = cornerRadius(main)
  const picture: CSSProperties = {
    ...pictureStyle(size, main.aspect, state),
    backgroundImage: lqip ? `url("${lqip}")` : undefined,
    backgroundSize: '100% 100%',
  }
  const cq = (px: number) => `${(px / main.drawnPx) * box.width}cqw`
  const ring = main.ring
  const frameArt = main.frameUrl ? frameMaskUrl(main.frameUrl, 800) : undefined
  // The frame's artwork spans the picture plus its inset on every side.
  const frameWidth = box.width / (1 - (main.insetPct * 2) / 100)
  const frameHeight = box.height / (1 - (main.insetPct * 2) / 100)

  return (
    <Card
      border
      radius={2}
      tone="transparent"
      style={{ width: '100%', maxWidth: 400, marginInline: 'auto' }}
    >
      <div
        ref={stageRef}
        data-picture-stage=""
        // Takes arrow keys, + and −, and 0 (described by the hidden text below).
        tabIndex={readOnly ? undefined : 0}
        role="group"
        aria-label="Picture position"
        aria-describedby={descriptionId}
        {...stageProps}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          touchAction: 'none',
          containerType: 'inline-size',
          cursor: readOnly ? 'default' : 'grab',
        }}
      >
        {/* The whole picture beyond the shape, dimmed. */}
        <div aria-hidden="true" style={boxStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a CDN preview in Studio, sized by the transform */}
          <img
            src={previewUrl}
            alt=""
            draggable={false}
            onError={onError}
            style={{ ...picture, opacity: 0.35 }}
          />
        </div>
        {/* The shape: the part the site shows. */}
        <div
          data-picture-shape=""
          ref={boxRef}
          aria-hidden="true"
          style={{ ...boxStyle, overflow: 'hidden', borderRadius: radius, boxShadow: OUTLINE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img src={previewUrl} alt="" draggable={false} onError={onError} style={picture} />
        </div>
        {ring ? (
          <div
            aria-hidden="true"
            data-picture-ring=""
            style={{
              position: 'absolute',
              boxSizing: 'border-box',
              left: `calc(${box.left}% - ${cq(ring.widthPx + ring.gapPx)})`,
              top: `calc(${box.top}% - ${cq(ring.widthPx + ring.gapPx)})`,
              width: `calc(${box.width}% + ${cq(2 * (ring.widthPx + ring.gapPx))})`,
              height: `calc(${box.height}% + ${cq(2 * (ring.widthPx + ring.gapPx))})`,
              borderRadius: radius,
              border: `${cq(ring.widthPx)} solid var(--card-focus-ring-color)`,
              pointerEvents: 'none',
            }}
          />
        ) : null}
        {frameArt ? (
          <div
            aria-hidden="true"
            data-picture-frame=""
            style={{
              position: 'absolute',
              left: `${50 - frameWidth / 2}%`,
              top: `${50 - frameHeight / 2}%`,
              width: `${frameWidth}%`,
              height: `${frameHeight}%`,
              pointerEvents: 'none',
              backgroundColor: 'var(--card-fg-color)',
              maskImage: `url("${frameArt}")`,
              WebkitMaskImage: `url("${frameArt}")`,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
        ) : null}
        {others.map((other) => {
          const outline = alsoShownOutline(main, other)
          return (
            <div
              key={other.label}
              aria-hidden="true"
              data-picture-also=""
              style={{
                ...boxStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: `${outline.width}%`,
                  height: `${outline.height}%`,
                  borderRadius: cornerRadius(other),
                  border: '1px dashed var(--card-bg-color)',
                  boxShadow: '0 0 0 1px var(--card-fg-color)',
                }}
              />
            </div>
          )
        })}
      </div>
      <span id={descriptionId} hidden>
        {readOnly
          ? 'Showing how the picture is framed. It can not be changed.'
          : STAGE_INSTRUCTIONS}
      </span>
      {others.length > 0 ? (
        <Flex padding={2} gap={2} wrap="wrap">
          {others.map((other) => (
            <Text key={other.label} size={0} muted>
              Also shown as: {other.label}
            </Text>
          ))}
        </Flex>
      ) : null}
    </Card>
  )
}
