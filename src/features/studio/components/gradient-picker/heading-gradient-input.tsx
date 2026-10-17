import { useMemo } from 'react'
import { set, unset, type StringInputProps } from 'sanity'

import { gradientFor, HEADING_GRADIENTS } from '@/config/heading-gradients'
import type { BrandGradient } from '@/lib/color/gradients'
import { brandColoursSlug, brandColoursValue } from '@/lib/color/heading-gradient'

import { gradientThumbnail } from './gradient-picker-input'
import { useBrandGradients } from './use-brand-gradients'
import { assignRef } from '../preset-picker/assign-ref'
import type { GridOption } from '../preset-picker/option-grid'
import { normalisePresetOptions } from '../preset-picker/options'
import { PickerView } from '../preset-picker/picker-view'

/**
 * The heading highlight's one gradient picker: the Brand colours gradients by name, then the
 * built-in ones from the field's own list (Brand to ink, Custom). A stored value that is no longer
 * offered stays in the list so it is visible and can be changed: Brand to green and Brand to red
 * (older content), or a Brand colours gradient that has since been removed.
 */
export function headingGradientOptions(
  brand: readonly BrandGradient[],
  builtIn: readonly GridOption[],
  stored: string | null,
): GridOption[] {
  const options: GridOption[] = [
    ...brand.map((gradient) => ({
      value: brandColoursValue(gradient.slug),
      title: gradient.name,
      description: `${gradient.stops.length} colours from Brand colours`,
      thumbnail: gradientThumbnail(gradient.css),
    })),
    ...builtIn,
  ]
  if (stored && !options.some((option) => option.value === stored)) {
    const legacy = HEADING_GRADIENTS.find((gradient) => gradient.value === stored)
    options.push(
      legacy
        ? {
            value: legacy.value,
            title: `${legacy.title} (older)`,
            description: 'No longer offered. Pick another to change it.',
            thumbnail: builtIn[0]?.thumbnail,
          }
        : {
            value: stored,
            title: brandColoursSlug(stored) ? 'Not in Brand colours' : 'Unknown gradient',
            description: `Removed or renamed, so the page shows ${gradientFor(null).title}. Choose another.`,
          },
    )
  }
  return options
}

/** The picker for a string field with `options.headingGradientPicker` (see lib/sanity/schema/heading-text.ts). */
export function HeadingGradientInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps } = props
  const brand = useBrandGradients()
  const stored = typeof value === 'string' && value !== '' ? value : null
  const builtIn = useMemo(() => normalisePresetOptions(schemaType.options?.list), [schemaType])
  // Unset shows the default (the first built-in) as chosen: it is what the page draws.
  const current = stored ?? builtIn[0]?.value ?? null
  const options = useMemo(
    () => headingGradientOptions(brand ?? [], builtIn, stored),
    [brand, builtIn, stored],
  )

  return (
    <PickerView
      options={options}
      value={current}
      label={schemaType.title ?? schemaType.name}
      readOnly={readOnly}
      id={elementProps.id}
      describedBy={elementProps['aria-describedby']}
      focusRef={(element) => {
        assignRef(elementProps.ref, element)
      }}
      onFocus={elementProps.onFocus}
      onBlur={elementProps.onBlur}
      onSelect={(next) => {
        onChange(next === '' ? unset() : set(next))
      }}
    />
  )
}
