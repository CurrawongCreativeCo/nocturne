import { createImageUrlBuilder } from '@sanity/image-url'
import { Stack } from '@sanity/ui'
import { useMemo } from 'react'
import {
  PatchEvent,
  set,
  setIfMissing,
  unset,
  useClient,
  useFormCallbacks,
  useFormValue,
  type StringInputProps,
} from 'sanity'

import { describeOutcome, describeOverlayFix } from '@/lib/color/contrast-remedy'
import {
  gradientPlace,
  overlayGradientContrastProblem,
  strongerGradientStops,
} from '@/lib/color/overlay-gradient-contrast'
import {
  GRADIENT_STOPS,
  resolveOverlayGradient,
  type GradientStop,
} from '@/lib/sanity/overlay-gradient'
import { ContrastFixPanel, type ContrastFixAction } from '@/lib/sanity/schema/contrast-fix-panel'
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
  overlayGradientTop?: { opacity?: number | null } | null
  overlayGradientMiddle?: { opacity?: number | null } | null
  overlayGradientBottom?: { opacity?: number | null } | null
  image?: { asset?: { _ref?: string }; hotspot?: { x?: number; y?: number } }
}

const STOP_FIELD: Record<
  GradientStop,
  'overlayGradientTop' | 'overlayGradientMiddle' | 'overlayGradientBottom'
> = {
  top: 'overlayGradientTop',
  middle: 'overlayGradientMiddle',
  bottom: 'overlayGradientBottom',
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
  const { onChange: patchForm } = useFormCallbacks()
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

  // A gradient that fails over a photo is fixed by a stronger overlay (the failing stops' opacity),
  // never a new colour. Nothing changes until the button is pressed.
  const problem = overlayGradientContrastProblem({ tone, gradient, strength, site: colours })
  const fix = problem
    ? strongerGradientStops({ tone, input: style, level, strength, site: colours })
    : null
  const fixText =
    problem && fix
      ? describeOverlayFix({
          ratio: problem.ratio,
          required: 4.5,
          raises: fix.raises.map(({ stop, from, to }) => ({
            place: gradientPlace(gradient.shape, stop),
            from,
            to,
          })),
          stuck: fix.stuck.map((stop) => gradientPlace(gradient.shape, stop)),
        })
      : ''
  // Measured again from the gradient as it now is, so a partial improvement never reads as done.
  const outcome = problem
    ? describeOutcome({
        measured: true,
        property: 'Text over this gradient',
        against: 'the lightest or darkest part of a photo at its weakest point',
        ratio: problem.ratio,
        required: 4.5,
        improved: true,
      })
    : {
        state: 'resolved' as const,
        text: 'Every stop now reaches 4.5:1 for text, even over the lightest or darkest part of a photo.',
      }
  const partial = (fix?.stuck.length ?? 0) > 0
  const stylePath = props.path.slice(0, -1)
  const stopPath = (stop: GradientStop) => [...stylePath, STOP_FIELD[stop]]
  const stored = (stop: GradientStop) => style[STOP_FIELD[stop]]?.opacity
  const heldKey = (raised: Partial<Record<GradientStop, number>>) =>
    GRADIENT_STOPS.map((stop) => raised[stop] ?? stored(stop) ?? '').join('|')
  const actions: ContrastFixAction[] =
    fix && fix.raises.length > 0
      ? [
          {
            id: 'stronger-overlay',
            label: partial ? 'Improve with a stronger overlay' : 'Use a stronger overlay',
            detail: partial
              ? 'Raises the opacity of the stops named above. The colours stay as they are. It improves the gradient but cannot fully fix it.'
              : 'Raises the opacity of the stops named above. The colours stay as they are.',
            after: heldKey(Object.fromEntries(fix.raises.map(({ stop, to }) => [stop, to]))),
            apply: () => {
              patchForm(
                PatchEvent.from(
                  fix.raises.flatMap(({ stop, to }) => [
                    setIfMissing({}, stopPath(stop)),
                    set(to, [...stopPath(stop), 'opacity']),
                  ]),
                ),
              )
            },
            undo: () => {
              patchForm(
                PatchEvent.from(
                  fix.raises.map(({ stop }) => {
                    const before = stored(stop)
                    return typeof before === 'number'
                      ? set(before, [...stopPath(stop), 'opacity'])
                      : unset([...stopPath(stop), 'opacity'])
                  }),
                ),
              )
            },
          },
        ]
      : []
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
        problemNote={() => fixText}
      />
      <ContrastFixPanel
        actions={actions}
        current={heldKey({})}
        outcome={outcome}
        readOnly={props.readOnly}
      />
    </Stack>
  )
}
