import { Box, Card, Stack, Text } from '@sanity/ui'

import { textColours } from '@/lib/color/background-contrast'
import type { ColourSet } from '@/lib/color/heading-contrast'
import {
  overlayGradientContrastProblem,
  stopColourHex,
} from '@/lib/color/overlay-gradient-contrast'
import { overlayGradientCss, type ResolvedOverlayGradient } from '@/lib/sanity/overlay-gradient'

/** The input's actual preview, also drawn by the offline brand preview gallery. */
export function OverlayPreview({
  url,
  position = 'center',
  strength,
  tone,
  gradient,
  colours,
}: {
  url: string
  position?: string
  strength: number
  tone: string
  gradient: ResolvedOverlayGradient
  colours: ColourSet
}) {
  const css = overlayGradientCss(gradient, stopColourHex(tone, colours))
  const problem = overlayGradientContrastProblem({ tone, gradient, strength, site: colours })
  const text = textColours(tone, colours)
  return (
    <Stack gap={3}>
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
