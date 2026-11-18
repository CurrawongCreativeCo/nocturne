import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useRef, useState } from 'react'
import { unset, type FormPatch } from 'sanity'

import type { FocusPlan } from '@/lib/sanity/image-frame-geometry'
import type { Crop, Hotspot } from '@/lib/sanity/image-framing'

import { FocusPictureDialog, type FocusSource } from './focus-picture-dialog'

export interface PictureFocusProps {
  value:
    | {
        asset?: unknown
        crop?: Partial<Crop> | null
        hotspot?: Partial<Hotspot> | null
      }
    | null
    | undefined
  plan: FocusPlan
  /** The preview to work on; undefined while the picture's size is unknown. */
  source: FocusSource | undefined
  readOnly?: boolean
  onChange: (patches: FormPatch[]) => void
}

/**
 * The row under Sanity's own image input for a picture that covers its background: a "Focus" button and one
 * line of state, in place of "Adjust picture". Reset removes only the saved hotspot, after asking: the crop
 * stays, and nothing else ever clears the focus, so changing the layout never loses it.
 */
export function PictureFocus({ value, plan, source, readOnly, onChange }: PictureFocusProps) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const set = Boolean(value?.hotspot)

  // The dialog closes into the button that opened it.
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus()
    wasOpen.current = open
  }, [open])

  if (!value?.asset || !source) return null

  return (
    <Stack gap={2} data-picture-focus="">
      <Flex align="center" gap={3} wrap="wrap">
        <Button
          ref={buttonRef}
          text={readOnly ? 'View focus' : 'Focus'}
          mode="ghost"
          fontSize={1}
          onClick={() => {
            setOpen(true)
          }}
        />
        <Flex align="center" gap={1}>
          <Text size={1} muted>
            {set ? 'Focus set' : 'Centred'}
          </Text>
          {set && !readOnly ? (
            <>
              <Text size={1} muted aria-hidden="true">
                ·
              </Text>
              <Button
                text="Reset"
                mode="bleed"
                fontSize={1}
                padding={2}
                aria-label="Reset picture focus"
                onClick={() => {
                  setRemoving(true)
                }}
              />
            </>
          ) : null}
        </Flex>
      </Flex>
      {removing ? (
        <Card border radius={2} padding={3} tone="caution">
          <Flex align="center" gap={3} justify="space-between" wrap="wrap">
            <Text size={1} role="alert">
              Remove the saved focus?
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
                  // Only the hotspot: a crop saved for Side or Stacked stays.
                  onChange([unset(['hotspot'])])
                  setRemoving(false)
                }}
              />
            </Flex>
          </Flex>
        </Card>
      ) : null}
      {open ? (
        <FocusPictureDialog
          label={plan.label}
          frames={plan.frames}
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
