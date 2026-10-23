import { createImageUrlBuilder } from '@sanity/image-url'
import { Stack } from '@sanity/ui'
import { useMemo } from 'react'
import { useClient, useFormValue, type StringInputProps } from 'sanity'

import { resolveOverlayGradient } from '@/lib/sanity/overlay-gradient'
import { useBrandColours } from '@/lib/sanity/schema/use-brand-colours'
import {
  defaultOverlayFor,
  imageStrengthOpacity,
  SECTION_OVERLAYS,
} from '@/lib/sanity/section-style-options'

import { OverlayPreview } from './overlay-preview'
import { PresetPickerInput } from './preset-picker/preset-picker-input'

interface Style {
  tone?: string
  overlay?: string
  overlayColor?: string
  overlayGradient?: string
  imageStrength?: string
  imageStrengthPercent?: number
  image?: { asset?: { _ref?: string }; hotspot?: { x?: number; y?: number } }
}

/**
 * The gradient overlay's picker (`options.overlayPreview`) with a preview under it: this section's
 * own picture, at its strength, with the gradient the page would draw over it (the same maths,
 * lib/sanity/overlay-gradient.ts, in this site's Brand colours) and two sample lines of text in the
 * section's text colours. It follows the strength, the shape and the Advanced stops as they change.
 * It is a phone-shaped crop of the picture, not the page: the page centres on the hotspot and draws
 * the real content.
 */
export function OverlayPreviewInput(props: StringInputProps) {
  const style = useFormValue(props.path.slice(0, -1)) as Style | undefined
  const client = useClient({ apiVersion: '2025-01-01' })
  const { colours } = useBrandColours()
  const builder = useMemo(() => createImageUrlBuilder(client), [client])
  const tone = style?.tone ?? 'surface'
  const level =
    SECTION_OVERLAYS.find((value) => value === style?.overlay) ?? defaultOverlayFor(tone)
  const ref = style?.image?.asset?._ref
  const strength = imageStrengthOpacity(style?.imageStrength, style?.imageStrengthPercent)

  if (level === 'none' || !ref) return <PresetPickerInput {...props} />
  const gradient = resolveOverlayGradient(style, level)
  const url = builder.image(ref).width(360).height(640).fit('crop').auto('format').url()
  const focus = style.image?.hotspot
  const position = focus
    ? `${String((focus.x ?? 0.5) * 100)}% ${String((focus.y ?? 0.5) * 100)}%`
    : 'center'

  return (
    <Stack gap={3}>
      <PresetPickerInput {...props} />
      <OverlayPreview
        url={url}
        position={position}
        strength={strength}
        tone={tone}
        gradient={gradient}
        colours={colours}
      />
    </Stack>
  )
}
