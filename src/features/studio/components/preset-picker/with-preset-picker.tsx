import type { ComponentType } from 'react'
import {
  isArrayOfObjectsInputProps,
  isNumberInputProps,
  isObjectInputProps,
  isStringInputProps,
  type InputProps,
} from 'sanity'

import { framingKeyOf } from '@/lib/sanity/schema/image-framing-option'

import { PresetBarInput } from './preset-bar-input'
import { PresetPickerInput } from './preset-picker-input'
import { AnchorPickerInput } from '../anchor-picker/anchor-picker-input'
import { FrameReferenceInput } from '../frame-reference-input'
import { GradientPickerInput } from '../gradient-picker/gradient-picker-input'
import { HeadingGradientInput } from '../gradient-picker/heading-gradient-input'
import { IconPickerInput } from '../icon-picker-input'
import { InheritableChoiceInput } from '../inheritable-choice-input'
import { LinkDesignSummaryInput } from '../link-design-summary-input'
import { OverlayPreviewInput } from '../overlay-preview-input'
import { PanelUsageInput } from '../panel-usage-input'
import { PictureFramingInput } from '../picture-framing/picture-framing-input'
import { SliderInput } from '../slider-input'
import { SlotInput } from '../slot-input'

/**
 * Wraps the Studio-wide input override (`form.components.input`): a string field with
 * `options.presetPicker` gets the picture picker, `options.iconPicker` the icon grid, `options.inheritable` the Inherit-first buttons, an object type with `options.presets` gets the
 * preset bar above its fields, an object with `options.linkDesignSummary` the link design summary and resets, an image with `options.framing` gets "Adjust picture" under it, a string field with `options.gradientPicker` gets the gradient list, `options.headingGradientPicker` the heading highlight's gradient picker, an array with `options.slot` gets the one-item slot input, and everything else goes to `Fallback` (the role-aware input).
 */
export function withPresetPicker(Fallback: ComponentType<InputProps>) {
  return function PresetAwareInput(props: InputProps) {
    if (
      isObjectInputProps(props) &&
      (props.schemaType.name === 'imageDesign' || props.path.at(-1) === 'profileDesign')
    ) {
      return <FrameReferenceInput {...props} />
    }
    if (
      isObjectInputProps(props) &&
      (props.schemaType.options as { linkDesignSummary?: boolean } | undefined)
        ?.linkDesignSummary === true
    ) {
      return <LinkDesignSummaryInput {...props} />
    }
    if (isObjectInputProps(props) && framingKeyOf(props.schemaType.options)) {
      return <PictureFramingInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.overlayPreview === true) {
      return <OverlayPreviewInput {...props} />
    }
    if (isNumberInputProps(props) && props.schemaType.options?.slider) {
      return <SliderInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.presetPicker === true) {
      return <PresetPickerInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.iconPicker === true) {
      return <IconPickerInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.inheritable) {
      return <InheritableChoiceInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.anchorPicker === true) {
      return <AnchorPickerInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.headingGradientPicker === true) {
      return <HeadingGradientInput {...props} />
    }
    if (isStringInputProps(props) && props.schemaType.options?.gradientPicker === true) {
      return <GradientPickerInput {...props} />
    }
    if (isArrayOfObjectsInputProps(props) && props.schemaType.options?.slot === true) {
      return <SlotInput {...props} />
    }
    if (
      isObjectInputProps(props) &&
      props.path.length === 0 &&
      (props.schemaType.options as { usedByButtons?: boolean } | undefined)?.usedByButtons === true
    ) {
      return <PanelUsageInput {...props} />
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
