import { set, unset, type StringInputProps } from 'sanity'

import { assignRef } from './assign-ref'
import { normalisePresetOptions } from './options'
import { PickerView } from './picker-view'

/**
 * The picker for a string field with `options.presetPicker` (see presetField in
 * src/lib/sanity/schema/preset-field.ts). Replaces the radio list; the stored value is the same.
 */
export function PresetPickerInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps } = props
  const options = normalisePresetOptions(schemaType.options?.list)

  return (
    <PickerView
      options={options}
      value={typeof value === 'string' ? value : null}
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
