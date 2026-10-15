import { set, unset, useFormValue, type StringInputProps } from 'sanity'

import { assignRef } from './assign-ref'
import { filterVisibleOptions, normalisePresetOptions } from './options'
import { PickerView } from './picker-view'

/**
 * The picker for a string field with `options.presetPicker` (see presetField in
 * src/lib/sanity/schema/preset-field.ts). Replaces the radio list; the stored value is the same.
 */
export function PresetPickerInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps, path } = props
  const document = useFormValue([])
  const current = typeof value === 'string' ? value : null
  const options = filterVisibleOptions(
    normalisePresetOptions(schemaType.options?.list),
    schemaType.options?.visibleOptions?.({ document, path }),
    current,
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
