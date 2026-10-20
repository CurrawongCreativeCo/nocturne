import { createImageUrlBuilder } from '@sanity/image-url'
import { Box, Card, Stack, Text } from '@sanity/ui'
import { useMemo } from 'react'
import { useClient, useFormValue, type StringInputProps } from 'sanity'

import { textColours } from '@/lib/color/background-contrast'
import {
  overlayGradientContrastProblem,
  stopColourHex,
} from '@/lib/color/overlay-gradient-contrast'
import { overlayGradientCss, resolveOverlayGradient } from '@/lib/sanity/overlay-gradient'
import { useBrandColours } from '@/lib/sanity/schema/use-brand-colours'
import {
  defaultOverlayFor,
  imageStrengthOpacity,
  SECTION_OVERLAYS,
} from '@/lib/sanity/section-style-options'

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
  const css = overlayGradientCss(gradient, stopColourHex(tone, colours))
  const problem = overlayGradientContrastProblem({ tone, gradient, strength, site: colours })
  const text = textColours(tone, colours)
  const url = builder.image(ref).width(360).height(640).fit('crop').auto('format').url()
  const focus = style.image?.hotspot
  const position = focus
    ? `${String((focus.x ?? 0.5) * 100)}% ${String((focus.y ?? 0.5) * 100)}%`
    : 'center'

  return (
    <Stack gap={3}>
      <PresetPickerInput {...props} />
      <Card radius={2} border overflow="hidden" style={{ maxWidth: 240 }} data-overlay-preview="">
        <div
          style={{
            position: 'relative',
            aspectRatio: '9 / 16',
            background: tone === 'inverse' ? colours.surfaceInverse : colours.surface,
          }}
        >
          {/* The section's own picture, from the CDN at preview size. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: position,
              opacity: strength,
            }}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: css }} />
          <Box style={{ position: 'absolute', insetInline: 16, top: '18%', textAlign: 'center' }}>
            <div style={{ color: text.body, fontWeight: 600, fontSize: 15 }}>Your name</div>
            <div style={{ color: text.secondary, fontSize: 12, marginTop: 4 }}>
              A line about you
            </div>
          </Box>
          <Box style={{ position: 'absolute', insetInline: 16, bottom: '10%' }}>
            {[0, 1].map((index) => (
              <div
                key={index}
                style={{
                  color: text.body,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  padding: '8px 0',
                }}
              >
                A link lower down
              </div>
            ))}
          </Box>
        </div>
      </Card>
      <Text size={1} muted>
        A preview over this section’s picture (cropped to a phone). The page draws your real content
        over the same gradient.
        {problem
          ? ` ${problem.message}`
          : ' Text passes 4.5:1 here even over the darkest or lightest part of a photo.'}
      </Text>
    </Stack>
  )
}
