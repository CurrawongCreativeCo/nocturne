import { Button, Flex, Text } from '@sanity/ui'
import { set, unset, type NumberInputProps } from 'sanity'

import { assignRef } from './preset-picker/assign-ref'

/**
 * A number as a slider (`options.slider`, e.g. a gradient stop's opacity), with the value beside it
 * and a Clear button: empty means "follow the preset", so clearing is how to go back. The native
 * range input keeps keyboard support (arrows, Page Up and Down, Home and End).
 */
export function SliderInput(props: NumberInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps } = props
  const slider = schemaType.options?.slider
  if (!slider) return props.renderDefault(props)
  const set_ = typeof value === 'number'
  const shown = set_ ? value : slider.min

  return (
    <Flex align="center" gap={3}>
      <input
        type="range"
        id={elementProps.id}
        ref={(element) => {
          assignRef(elementProps.ref, element)
        }}
        aria-describedby={elementProps['aria-describedby']}
        aria-label={schemaType.title ?? schemaType.name}
        aria-valuetext={set_ ? `${String(shown)}${slider.unit}` : 'Follows the preset'}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={shown}
        disabled={readOnly}
        onFocus={elementProps.onFocus}
        onBlur={elementProps.onBlur}
        onChange={(event) => {
          onChange(set(Number(event.currentTarget.value)))
        }}
        style={{ flex: 1, opacity: set_ ? 1 : 0.5 }}
      />
      <Text size={1} style={{ minWidth: 72 }}>
        {set_ ? `${String(shown)}${slider.unit}` : 'Preset'}
      </Text>
      <Button
        text="Clear"
        mode="ghost"
        fontSize={1}
        padding={2}
        disabled={Boolean(readOnly) || !set_}
        onClick={() => {
          onChange(unset())
        }}
      />
    </Flex>
  )
}
