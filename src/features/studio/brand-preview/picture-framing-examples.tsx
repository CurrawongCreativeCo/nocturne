import { Card, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import type { FormPatch } from 'sanity'

import type { FrameShapes } from '@/lib/sanity/image-frame-geometry'
import type { Crop, Hotspot } from '@/lib/sanity/image-framing'

import { PictureFraming } from '../components/picture-framing/picture-framing'

/** A landscape picture with a clear centre, so a drag or zoom is easy to see. */
const SAMPLE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a6fa5"/><stop offset="1" stop-color="#e0a458"/></linearGradient></defs>' +
    '<rect width="1600" height="1200" fill="url(#g)"/>' +
    '<circle cx="800" cy="520" r="210" fill="#f4e4d0"/><circle cx="730" cy="480" r="26" fill="#3a2a22"/><circle cx="870" cy="480" r="26" fill="#3a2a22"/>' +
    '<path d="M700 590 Q800 670 900 590" stroke="#3a2a22" stroke-width="22" fill="none" stroke-linecap="round"/>' +
    '<rect x="520" y="780" width="560" height="420" rx="200" fill="#2f3e5c"/></svg>',
)}`

interface Value {
  asset: { _ref: string }
  crop?: Partial<Crop>
  hotspot?: Partial<Hotspot>
}

const CIRCLE: FrameShapes = [
  { label: 'Profile picture', aspect: 1, corner: 'circle', insetPct: 0, drawnPx: 128 },
]
const WIDE: FrameShapes = [
  { label: 'Wide card', aspect: 16 / 9, corner: 'card', insetPct: 0, drawnPx: 640 },
]

/** Applies Sanity's set and unset patches to the two framing values, as the form would. */
function apply(value: Value, patches: FormPatch[]): Value {
  let next = { ...value }
  for (const patch of patches) {
    const [key] = patch.path
    if (key !== 'crop' && key !== 'hotspot') continue
    if (patch.type === 'unset') {
      const { [key]: _removed, ...rest } = next
      next = rest
    } else if (patch.type === 'set') {
      next = { ...next, [key]: patch.value as unknown as Crop }
    }
  }
  return next
}

function Example({ id, title, shapes }: { id: string; title: string; shapes: FrameShapes }) {
  const [value, setValue] = useState<Value>({ asset: { _ref: 'image-sample-1600x1200-svg' } })
  return (
    <Card padding={4} radius={3} border data-framing-example={id}>
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        <PictureFraming
          value={value}
          shapes={shapes}
          source={{ size: { width: 1600, height: 1200 }, previewUrl: SAMPLE }}
          onChange={(patches) => {
            setValue((current) => apply(current, patches))
          }}
        />
        <Text size={0} muted data-framing-values="">
          {JSON.stringify({ crop: value.crop, hotspot: value.hotspot })}
        </Text>
      </Stack>
    </Card>
  )
}

/**
 * "Adjust picture" in memory (no Studio form), for the accessibility and screenshot tests: a
 * circle and a 16:9 card over a sample picture. Apply and Reset change the values shown below.
 */
export function PictureFramingExamples() {
  return (
    <Stack gap={4} data-framing-examples="">
      <Example id="circle" title="Adjust picture: circle" shapes={CIRCLE} />
      <Example id="wide" title="Adjust picture: 16:9" shapes={WIDE} />
    </Stack>
  )
}
