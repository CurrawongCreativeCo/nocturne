import { Box, Button, Card, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { set, unset, type FormPatch } from 'sanity'

import {
  coverPosition,
  focusOf,
  hotspotFromFocus,
  type Focus,
  type FocusFrame,
} from '@/lib/sanity/image-focus'
import type { Crop, Hotspot } from '@/lib/sanity/image-framing'

import { FocusFrames } from './focus-frames'
import { FocusPictureStage } from './focus-picture-stage'

/** The picture as the page serves it: cut to its stored crop, at editing size. */
export interface FocusSource {
  previewUrl: string
  /** Width over height of the picture served (the upload less its crop). */
  aspect: number
  lqip?: string
}

export interface FocusPictureDialogProps {
  /** "Text over media background": what this placement is. */
  label: string
  frames: readonly FocusFrame[]
  source: FocusSource
  /** The field's stored framing. Only `hotspot` is ever written. */
  stored: { crop?: Partial<Crop> | null; hotspot?: Partial<Hotspot> | null }
  readOnly?: boolean
  onApply: (patches: FormPatch[]) => void
  onClose: () => void
}

const same = (a: Focus | undefined, b: Focus | undefined) =>
  a === b || (a && b && Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4)

/**
 * "Focus": for a picture that covers its background and so has no fixed shape to place a crop in. Choose the
 * point that must stay in view and see it in phone, tablet and desktop frames. Apply writes the field's
 * `hotspot` and nothing else; Reset removes only the hotspot. The crop, the picture and the alt text are untouched.
 */
export function FocusPictureDialog({
  label,
  frames,
  source,
  stored,
  readOnly,
  onApply,
  onClose,
}: FocusPictureDialogProps) {
  const id = useId()
  const initial = useMemo(
    () => focusOf(stored as Parameters<typeof focusOf>[0]),
    // Opened once: the stored values do not change under the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [draft, setDraft] = useState<Focus | undefined>(initial)
  const [confirming, setConfirming] = useState(false)
  const [broken, setBroken] = useState(false)
  const [failed, setFailed] = useState(0)
  const keepRef = useRef<HTMLButtonElement>(null)
  const dirty = !same(draft, initial)

  // The page's own answer for the hotspot this would store, so the frames and the page cannot differ.
  const position = useMemo(
    () =>
      draft
        ? coverPosition({
            crop: stored.crop as never,
            hotspot: hotspotFromFocus(stored as never, draft) as never,
          })
        : undefined,
    [draft, stored],
  )

  const requestClose = () => {
    if (dirty && !readOnly) setConfirming(true)
    else onClose()
  }

  const apply = () => {
    if (dirty) {
      if (draft) {
        onApply([
          set({ _type: 'sanity.imageHotspot', ...hotspotFromFocus(stored as never, draft) }, [
            'hotspot',
          ]),
        ])
      } else {
        onApply([unset(['hotspot'])])
      }
    }
    onClose()
  }

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
          <Button
            text="Reset"
            mode="ghost"
            disabled={!draft}
            onClick={() => {
              setDraft(undefined)
            }}
          />
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
      id={`focus-picture-${id}`}
      header="Focus"
      width={1}
      onClose={requestClose}
      onClickOutside={requestClose}
      footer={footer}
    >
      <Box padding={4}>
        <Stack gap={4}>
          <Text size={1} muted>
            {label}: the picture covers the section, so it can’t be cropped to a shape here. Choose
            the point that must stay in view.
          </Text>
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
            <FocusPictureStage
              key={failed}
              previewUrl={source.previewUrl}
              aspect={source.aspect}
              lqip={source.lqip}
              focus={draft}
              onChange={setDraft}
              readOnly={readOnly}
              onError={() => {
                setBroken(true)
              }}
            />
          )}
          <FocusFrames frames={frames} previewUrl={source.previewUrl} position={position} />
        </Stack>
      </Box>
    </Dialog>
  )
}
