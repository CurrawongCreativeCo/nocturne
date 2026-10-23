import { AddIcon } from '@sanity/icons/Add'
import { ArrowDownIcon } from '@sanity/icons/ArrowDown'
import { ArrowLeftIcon } from '@sanity/icons/ArrowLeft'
import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { ArrowUpIcon } from '@sanity/icons/ArrowUp'
import { RemoveIcon } from '@sanity/icons/Remove'
import { Box, Button, Card, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { set, unset, type FormPatch } from 'sanity'

import type { FrameShapes } from '@/lib/sanity/image-frame-geometry'
import {
  framingContext,
  fromImage,
  isFramed,
  isSoft,
  setZoom,
  stepPicture,
  stepZoom,
  toCrop,
  type AssetSize,
  type Crop,
  type Direction,
  type FramingState,
  type Hotspot,
} from '@/lib/sanity/image-framing'

import { describeChange } from './describe-change'
import { PictureStage } from './picture-stage'

/** The preview the editor works on: the CDN at about 1200 px, never the original upload. */
export interface PictureSource {
  size: AssetSize
  previewUrl: string
  /** The asset's blurred placeholder, shown while the preview loads. */
  lqip?: string
}

export interface AdjustPictureDialogProps {
  shapes: FrameShapes
  source: PictureSource
  /** The field's stored framing. */
  stored: { crop?: Partial<Crop> | null; hotspot?: Partial<Hotspot> | null }
  readOnly?: boolean
  /** One call with the patches to apply together, as Sanity's own crop tool sends them. */
  onApply: (patches: FormPatch[]) => void
  onClose: () => void
}

interface Draft {
  state: FramingState
  /** Automatic fit: nothing stored. */
  auto: boolean
}

const MOVES: { direction: Direction; label: string; icon: typeof ArrowUpIcon }[] = [
  { direction: 'up', label: 'Move picture up', icon: ArrowUpIcon },
  { direction: 'left', label: 'Move picture left', icon: ArrowLeftIcon },
  { direction: 'right', label: 'Move picture right', icon: ArrowRightIcon },
  { direction: 'down', label: 'Move picture down', icon: ArrowDownIcon },
]

/** WCAG 2.5.8: 44 px targets for the controls that stand in for dragging and pinching. */
const TARGET: React.CSSProperties = { minWidth: 44, minHeight: 44 }

const sameState = (a: FramingState, b: FramingState) =>
  Math.abs(a.zoom - b.zoom) < 1e-4 &&
  Math.abs(a.centre.x - b.centre.x) < 1e-4 &&
  Math.abs(a.centre.y - b.centre.y) < 1e-4

/**
 * "Adjust picture": drag the picture into place inside the real shape, zoom with a slider, and
 * apply. Apply writes the field's `crop` and `hotspot` in one change (the same two values Sanity's
 * crop tool edits); Reset goes back to the automatic fit by removing both.
 */
export function AdjustPictureDialog({
  shapes,
  source,
  stored,
  readOnly,
  onApply,
  onClose,
}: AdjustPictureDialogProps) {
  const id = useId()
  const [main, ...others] = shapes
  const { size } = source
  const context = useMemo(
    () => framingContext(size, main.aspect, main.drawnPx),
    [size, main.aspect, main.drawnPx],
  )
  const automatic = useMemo(
    () => fromImage({ asset: size, aspect: main.aspect, defaultAspect: main.defaultAspect }),
    [size, main.aspect, main.defaultAspect],
  )
  const initial = useMemo<Draft>(
    () =>
      isFramed(stored)
        ? {
            state: fromImage({
              asset: size,
              aspect: main.aspect,
              defaultAspect: main.defaultAspect,
              crop: stored.crop,
              hotspot: stored.hotspot,
            }),
            auto: false,
          }
        : { state: automatic, auto: true },
    // Opened once: the stored values do not change under the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [draft, setDraft] = useState<Draft>(initial)
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(0)
  const [broken, setBroken] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const announced = useRef(draft.state)
  const keepRef = useRef<HTMLButtonElement>(null)

  const dirty =
    draft.auto !== initial.auto || (!draft.auto && !sameState(draft.state, initial.state))
  const soft = isSoft(size, main.aspect, draft.state.zoom, main.drawnPx)
  const zoomPercent = Math.round(draft.state.zoom * 100)
  const canZoom = context.maxZoom > 1

  const move = (next: FramingState) => {
    setDraft({ state: next, auto: false })
  }
  const reset = () => {
    setDraft({ state: automatic, auto: true })
  }

  const requestClose = () => {
    if (dirty && !readOnly) setConfirming(true)
    else onClose()
  }

  const apply = () => {
    if (dirty) {
      if (draft.auto) {
        onApply([unset(['crop']), unset(['hotspot'])])
      } else {
        const { crop, hotspot } = toCrop({ asset: size, aspect: main.aspect, ...draft.state })
        onApply([set(crop, ['crop']), set(hotspot, ['hotspot'])])
      }
    }
    onClose()
  }

  // A polite message after a pause, never on every frame.
  useEffect(() => {
    const timer = setTimeout(() => {
      const message = describeChange(announced.current, draft.state)
      announced.current = draft.state
      if (message) setAnnouncement(message)
    }, 500)
    return () => {
      clearTimeout(timer)
    }
  }, [draft.state])

  useEffect(() => {
    if (confirming) keepRef.current?.focus()
  }, [confirming])

  const footer = confirming ? (
    <Box padding={3}>
      <Flex align="center" gap={3} justify="space-between" wrap="wrap">
        <Text size={1} weight="semibold" role="alert">
          Discard changes?
        </Text>
        <Flex gap={2}>
          <Button
            ref={keepRef}
            text="Keep editing"
            mode="ghost"
            onClick={() => {
              setConfirming(false)
            }}
          />
          <Button text="Discard" tone="critical" onClick={onClose} />
        </Flex>
      </Flex>
    </Box>
  ) : (
    <Box padding={3}>
      <Flex gap={2} justify="space-between" wrap="wrap">
        {readOnly ? (
          <span />
        ) : (
          <Button text="Reset" mode="ghost" disabled={draft.auto} onClick={reset} />
        )}
        <Flex gap={2}>
          <Button text={readOnly ? 'Close' : 'Cancel'} mode="ghost" onClick={requestClose} />
          {readOnly ? null : <Button text="Apply" tone="primary" onClick={apply} />}
        </Flex>
      </Flex>
    </Box>
  )

  return (
    <Dialog
      id={`adjust-picture-${id}`}
      header="Adjust picture"
      width={1}
      onClose={requestClose}
      onClickOutside={requestClose}
      footer={footer}
    >
      <Box padding={4}>
        <Stack gap={4}>
          {broken ? (
            <Card border radius={2} padding={4} tone="critical">
              <Stack gap={3}>
                <Text size={1}>The picture couldn’t load</Text>
                <Box>
                  <Button
                    text="Try again"
                    mode="ghost"
                    onClick={() => {
                      setBroken(false)
                      setFailed((count) => count + 1)
                    }}
                  />
                </Box>
              </Stack>
            </Card>
          ) : (
            <PictureStage
              key={failed}
              shape={main}
              others={others}
              size={size}
              previewUrl={source.previewUrl}
              lqip={source.lqip}
              state={draft.state}
              context={context}
              onChange={move}
              onReset={reset}
              readOnly={readOnly}
              onError={() => {
                setBroken(true)
              }}
            />
          )}
          {readOnly ? (
            <Text size={1} muted>
              This picture’s framing can’t be changed here.
            </Text>
          ) : (
            <>
              <Text size={1} muted>
                Drag to reposition. Use the slider to zoom.
              </Text>
              <Flex align="center" gap={2}>
                <Button
                  icon={RemoveIcon}
                  mode="ghost"
                  aria-label="Zoom out"
                  disabled={!canZoom}
                  style={TARGET}
                  onClick={() => {
                    move(stepZoom(draft.state, context, -1))
                  }}
                />
                <input
                  type="range"
                  aria-label="Zoom"
                  aria-valuetext={`Zoom ${zoomPercent}%`}
                  min={100}
                  max={Math.max(100, Math.round(context.maxZoom * 100))}
                  step={1}
                  value={zoomPercent}
                  disabled={!canZoom}
                  onChange={(event) => {
                    move(setZoom(draft.state, context, Number(event.currentTarget.value) / 100))
                  }}
                  style={{ flex: 1, minHeight: 44 }}
                />
                <Button
                  icon={AddIcon}
                  mode="ghost"
                  aria-label="Zoom in"
                  disabled={!canZoom}
                  style={TARGET}
                  onClick={() => {
                    move(stepZoom(draft.state, context, 1))
                  }}
                />
                <Text size={1} style={{ minWidth: 48, textAlign: 'end' }}>
                  {zoomPercent}%
                </Text>
              </Flex>
              {canZoom ? null : (
                <Text size={1} muted>
                  This picture is too small to zoom in further.
                </Text>
              )}
              {soft ? (
                <Text size={1} muted>
                  Zooming further may make the picture look soft.
                </Text>
              ) : null}
              <Flex role="group" aria-label="Move picture" gap={2} wrap="wrap">
                {MOVES.map(({ direction, label, icon }) => (
                  <Button
                    key={direction}
                    icon={icon}
                    mode="ghost"
                    aria-label={label}
                    style={TARGET}
                    onClick={() => {
                      move(stepPicture(draft.state, context, direction))
                    }}
                  />
                ))}
              </Flex>
            </>
          )}
          <span
            role="status"
            aria-live="polite"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {announcement}
          </span>
        </Stack>
      </Box>
    </Dialog>
  )
}
