import type { ComponentType } from 'react'
import {
  isArrayOfObjectsInputProps,
  isObjectInputProps,
  isStringInputProps,
  type InputProps,
} from 'sanity'

import { PresetBarInput } from './preset-bar-input'
import { PresetPickerInput } from './preset-picker-input'
import { AnchorPickerInput } from '../anchor-picker/anchor-picker-input'
import { GradientPickerInput } from '../gradient-picker/gradient-picker-input'
import { SlotInput } from '../slot-input'

/**
 * Wraps the Studio-wide input override (`form.components.input`): a string field with
 * `options.presetPicker` gets the picture picker, an object type with `options.presets` gets the
 * preset bar above its fields, a string field with `options.gradientPicker` gets the gradient list, an array with `options.slot` gets the one-item slot input, and everything else goes to `Fallback` (the role-aware input).
 */
export function withPresetPicker(Fallback: ComponentType<InputProps>) {
  return function PresetAwareInput(props: InputProps) {
    if (isStringInputProps(props) && props.schemaType.options?.presetPicker === true) {
      return <PresetPickerInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.anchorPicker === true) {
      return <AnchorPickerInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.gradientPicker === true) {
      return <GradientPickerInput {...props} />
    }
    if (isArrayOfObjectsInputProps(props) && props.schemaType.options?.slot === true) {
      return <SlotInput {...props} />
    }
    if (
      isObjectInputProps(props) &&
      Array.isArray((props.schemaType.options as { presets?: unknown } | undefined)?.presets)
    ) {
      return <PresetBarInput {...props} />
    }
    return <Fallback {...props} />
  }
}
