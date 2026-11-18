import { Flex, Stack, Text } from '@sanity/ui'

import type { FocusFrame } from '@/lib/sanity/image-focus'

/** The height every frame is drawn at; its width follows the frame's ratio. */
const FRAME_HEIGHT = 112

export interface FocusFramesProps {
  frames: readonly FocusFrame[]
  previewUrl: string
  /** The `object-position` the page would use for the focus chosen: `coverPosition`'s answer. */
  position: string | undefined
}

/**
 * The picture covering each frame the way the page covers its background: `object-fit: cover`, positioned by
 * the focus. The frames are indicative, as a section's height follows its text; the picture the page draws is
 * also dimmed under the text.
 */
export function FocusFrames({ frames, previewUrl, position }: FocusFramesProps) {
  return (
    <Stack gap={2}>
      <Text size={1} weight="semibold">
        How it sits
      </Text>
      <Flex gap={3} wrap="wrap" align="flex-end" role="list" aria-label="Focus previews">
        {frames.map((frame) => (
          <Stack key={frame.label} gap={1} role="listitem" data-focus-frame={frame.label}>
            <div
              style={{
                height: FRAME_HEIGHT,
                width: Math.round(FRAME_HEIGHT * frame.aspect),
                maxWidth: '100%',
                overflow: 'hidden',
                borderRadius: 3,
                outline: '1px solid var(--card-border-color)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                data-focus-position={position ?? 'centre'}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: position,
                }}
              />
            </div>
            <Text size={0} muted>
              {frame.label}, {frame.widthPx}px wide
            </Text>
          </Stack>
        ))}
      </Flex>
      <Text size={1} muted>
        Indicative: the section grows with its text.
      </Text>
    </Stack>
  )
}
