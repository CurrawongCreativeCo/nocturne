'use client'

import { Card, Stack, Text } from '@sanity/ui'
import { useId, useState } from 'react'
import { PatchEvent, type NumberInputProps, type StringInputProps } from 'sanity'

import { colorHex } from '@/config/tokens.generated'
import { BADGE_ICONS } from '@/lib/sanity/badge-icons'
import { resolveOverlayGradient } from '@/lib/sanity/overlay-gradient'
import { overlayGradientThumbnails } from '@/lib/sanity/schema/thumbnails/background-image-thumbnails'

import { IconPickerInput } from '../components/icon-picker-input'
import { InheritableChoiceInput } from '../components/inheritable-choice-input'
import { OverlayPreview } from '../components/overlay-preview'
import { PickerView } from '../components/preset-picker/picker-view'
import { SliderInput } from '../components/slider-input'

/** Apply the same scalar set/unset patches these Studio inputs emit, without a Content Lake. */
function scalarPatch<T>(
  patch: Parameters<typeof PatchEvent.from>[0],
  update: (value: T | undefined) => void,
) {
  for (const operation of PatchEvent.from(patch).patches) {
    if (operation.type === 'set') update(operation.value as T)
    if (operation.type === 'unset') update(undefined)
  }
}

export function DesignInputExamples() {
  const id = useId()
  const [border, setBorder] = useState<string>()
  const [icon, setIcon] = useState<string | undefined>('lotus')
  const [strength, setStrength] = useState<number | undefined>(60)
  const [overlay, setOverlay] = useState('even')
  // These inputs use only the scalar input contract, with no Studio form context.
  const inputProps = (
    name: string,
    title: string,
    options: Record<string, unknown>,
    value: unknown,
    update: (patch: Parameters<typeof PatchEvent.from>[0]) => void,
  ) => ({
    schemaType: { name, title, options },
    value,
    onChange: update,
    readOnly: false,
    path: [name],
    elementProps: {
      id: `${id}-${name}`,
      ref: { current: null },
      onFocus: () => undefined,
      onBlur: () => undefined,
    },
  })
  return (
    <Stack gap={4}>
      <Card padding={4} border radius={3}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Inheritable choice
          </Text>
          <InheritableChoiceInput
            {...(inputProps(
              'border',
              'Border',
              {
                inheritable: true,
                list: [
                  { value: 'none', title: 'None' },
                  { value: 'thin', title: 'Thin' },
                ],
              },
              border,
              (patch) => scalarPatch(patch, setBorder),
            ) as unknown as StringInputProps)}
          />
        </Stack>
      </Card>
      <Card padding={4} border radius={3}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Icon picker
          </Text>
          <IconPickerInput
            {...(inputProps(
              'icon',
              'Icon',
              { iconPicker: true, list: BADGE_ICONS },
              icon,
              (patch) => scalarPatch(patch, setIcon),
            ) as unknown as StringInputProps)}
          />
        </Stack>
      </Card>
      <Card padding={4} border radius={3}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Slider
          </Text>
          <SliderInput
            {...(inputProps(
              'strength',
              'Strength',
              { slider: { min: 0, max: 100, step: 1, unit: '%' } },
              strength,
              (patch) => scalarPatch(patch, setStrength),
            ) as unknown as NumberInputProps)}
          />
        </Stack>
      </Card>
      <Card padding={4} border radius={3}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Overlay preview
          </Text>
          <PickerView
            label="Overlay gradient"
            value={overlay}
            onSelect={setOverlay}
            options={Object.entries(overlayGradientThumbnails).map(([value, thumbnail]) => ({
              value,
              title: value,
              thumbnail,
            }))}
          />
          <OverlayPreview
            url="/icon.png"
            strength={(strength ?? 60) / 100}
            tone="surface"
            colours={colorHex}
            gradient={resolveOverlayGradient({ overlayGradient: overlay }, 'strong')}
          />
        </Stack>
      </Card>
    </Stack>
  )
}
