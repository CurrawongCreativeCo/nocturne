import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useRef, useState } from 'react'
import { unset, type FormPatch } from 'sanity'

import type { FrameShape } from '@/lib/sanity/image-frame-geometry'
import { isFramed, type Crop, type Hotspot } from '@/lib/sanity/image-framing'

import { AdjustPictureDialog, type PictureSource } from './adjust-picture-dialog'

export interface PictureFramingProps {
  /** The image field's value. Nothing shows until a picture is chosen. */
  value:
    | {
        asset?: unknown
        crop?: Partial<Crop> | null
        hotspot?: Partial<Hotspot> | null
      }
    | null
    | undefined
  /** The shapes the picture is drawn in, main first; none when it is shown whole. */
  shapes: FrameShape[]
  /** The preview to work on; undefined while the picture's size is unknown. */
  source: PictureSource | undefined
  readOnly?: boolean
  onChange: (patches: FormPatch[]) => void
}

const REMOVE = [unset(['crop']), unset(['hotspot'])]

/**
 * The row under Sanity's own image input: an "Adjust picture" button and one line of state. The
 * dialog is `AdjustPictureDialog`. Reset removes the saved positioning (after asking); nothing
 * else ever clears it, so changing a shape never loses an adjustment.
 */
export function PictureFraming({ value, shapes, source, readOnly, onChange }: PictureFramingProps) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const framed = isFramed(value)

  // The dialog closes into the button that opened it.
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  if (!value?.asset || !source) return null

  const reset = removing ? (
    <Card border radius={2} padding={3} tone="caution">
      <Flex align="center" gap={3} justify="space-between" wrap="wrap">
        <Text size={1} role="alert">
          Remove the saved positioning?
        </Text>
        <Flex gap={2}>
          <Button
            text="Keep"
            mode="ghost"
            fontSize={1}
            onClick={() => {
              setRemoving(false)
            }}
          />
          <Button
            text="Remove"
            tone="critical"
            fontSize={1}
            onClick={() => {
              onChange(REMOVE)
              setRemoving(false)
            }}
          />
        </Flex>
      </Flex>
    </Card>
  ) : null

  const resetButton =
    framed && !readOnly ? (
      <Button
        text="Reset"
        mode="bleed"
        fontSize={1}
        padding={2}
        aria-label="Reset picture positioning"
        onClick={() => {
          setRemoving(true)
        }}
      />
    ) : null

  const [main, ...others] = shapes
  if (!main) {
    return (
      <Stack gap={2} data-picture-framing="whole">
        <Flex align="center" gap={2} wrap="wrap">
          <Text size={1} muted>
            {framed
              ? 'Your image positioning is saved but isn’t applied in uncropped mode.'
              : 'Shown whole, so there’s nothing to adjust.'}
          </Text>
          {resetButton}
        </Flex>
        {reset}
      </Stack>
    )
  }

  return (
    <Stack gap={2} data-picture-framing="">
      <Flex align="center" gap={3} wrap="wrap">
        <Button
          ref={buttonRef}
          text={readOnly ? 'View framing' : 'Adjust picture'}
          mode="ghost"
          fontSize={1}
          onClick={() => {
            setOpen(true)
          }}
        />
        <Flex align="center" gap={1}>
          <Text size={1} muted>
            {framed ? 'Adjusted' : 'Automatic fit'}
          </Text>
          {framed && !readOnly ? (
            <Text size={1} muted aria-hidden="true">
              ·
            </Text>
          ) : null}
          {resetButton}
        </Flex>
      </Flex>
      {reset}
      {open ? (
        <AdjustPictureDialog
          shapes={[main, ...others]}
          source={source}
          stored={value}
          readOnly={readOnly}
          onApply={onChange}
          onClose={() => {
            setOpen(false)
          }}
        />
      ) : null}
    </Stack>
  )
}
