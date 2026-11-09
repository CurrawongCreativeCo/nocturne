import { useMemo } from 'react'
import { set, unset, type StringInputProps } from 'sanity'

import type { BrandGradient } from '@/lib/color/gradients'
import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

import { useBrandGradients, useDocumentGradients } from './use-brand-gradients'
import { assignRef } from '../preset-picker/assign-ref'
import type { GridOption } from '../preset-picker/option-grid'
import { PickerView } from '../preset-picker/picker-view'

const NONE = ''

/** A swatch of the gradient itself, drawn from the same CSS the page uses. */
export function gradientThumbnail(css: string) {
  return function GradientSwatch(_props: PresetThumbnailProps) {
    return <div aria-hidden="true" style={{ width: '100%', height: '100%', background: css }} />
  }
}

/** "None", then each gradient; a stored one that has left Design settings stays visible to be cleared. */
export function gradientOptions(
  gradients: readonly BrandGradient[],
  stored: string | null,
): GridOption[] {
  const options: GridOption[] = [
    { value: NONE, title: 'None', description: 'Just the background colour.' },
    ...gradients.map((gradient) => ({
      value: gradient.slug,
      title: gradient.name,
      description: `${gradient.stops.length} colours`,
      thumbnail: gradientThumbnail(gradient.css),
    })),
  ]
  if (stored && !gradients.some((gradient) => gradient.slug === stored)) {
    options.push({
      value: stored,
      title: 'Not in Brand colours',
      description: 'Removed or renamed, so the page shows no gradient. Choose another or None.',
    })
  }
  return options
}

/** The picker for a string field with `options.gradientPicker` (see section-style.ts): published gradients. */
export function GradientPickerInput(props: StringInputProps) {
  return <GradientPicker {...props} gradients={useBrandGradients()} />
}

/**
 * The picker for a field with `options.documentGradients`: the gradients of the Brand colours
 * document being edited, drafts included, because that document is what the field sits in and the
 * resolver reads the same draft. Elsewhere the published list is right (a section can only use what
 * the site defines), so this is opt-in.
 */
export function DocumentGradientPickerInput(props: StringInputProps) {
  return <GradientPicker {...props} gradients={useDocumentGradients()} />
}

function GradientPicker({
  schemaType,
  value,
  onChange,
  readOnly,
  elementProps,
  gradients,
}: StringInputProps & { gradients: BrandGradient[] | null }) {
  const stored = typeof value === 'string' && value !== '' ? value : null
  const options = useMemo(() => gradientOptions(gradients ?? [], stored), [gradients, stored])

  return (
    <PickerView
      options={options}
      value={stored ?? NONE}
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
        onChange(next === NONE ? unset() : set(next))
      }}
    />
  )
}
