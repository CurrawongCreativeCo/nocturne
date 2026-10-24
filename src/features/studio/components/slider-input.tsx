import { Button, Flex, Stack, Text } from '@sanity/ui'
import { set, unset, useFormValue, type NumberInputProps, type NumberOptions } from 'sanity'

import { assignRef } from './preset-picker/assign-ref'

type Slider = NonNullable<NumberOptions['slider']>
type Inherited = ReturnType<NonNullable<Slider['inherited']>>

/**
 * A number as a slider (`options.slider`, e.g. a gradient stop's opacity), with the value beside it
 * and a Clear button: empty means "follow the preset", so clearing is how to go back. While empty the
 * slider rests on the value it follows and says where that comes from (`slider.inherited`, e.g.
 * "55% from the Even atmosphere preset, Medium overlay"). The native range input keeps keyboard
 * support (arrows, Page Up and Down, Home and End).
 */
export function SliderInput(props: NumberInputProps) {
  const slider = props.schemaType.options?.slider
  if (!slider) return props.renderDefault(props)
  // Only a slider that follows something reads the form, so one outside a form (the brand
  // preview's examples) still renders.
  return slider.inherited ? (
    <InheritedSlider {...props} slider={slider} />
  ) : (
    <SliderControl {...props} slider={slider} />
  )
}

function InheritedSlider(props: NumberInputProps & { slider: Slider }) {
  // The object above the number's own object (a gradient stop's section style).
  const container = useFormValue(props.path.slice(0, -2))
  const inherited =
    typeof props.value === 'number' ? undefined : props.slider.inherited?.({ container })
  return <SliderControl {...props} inherited={inherited} />
}

function SliderControl({
  schemaType,
  value,
  onChange,
  readOnly,
  elementProps,
  slider,
  inherited,
}: NumberInputProps & { slider: Slider; inherited?: Inherited }) {
  const set_ = typeof value === 'number'
  const shown = set_ ? value : (inherited?.value ?? slider.min)
  const valueText = `${String(shown)}${slider.unit}`

  return (
    <Stack gap={2}>
      <Flex align="center" gap={3}>
        <input
          type="range"
          id={elementProps.id}
          ref={(element) => {
            assignRef(elementProps.ref, element)
          }}
          aria-describedby={elementProps['aria-describedby']}
          aria-label={schemaType.title ?? schemaType.name}
          aria-valuetext={
            set_
              ? valueText
              : inherited
                ? `${valueText} from the ${inherited.source}`
                : 'Follows the preset'
          }
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
          {set_ || inherited ? valueText : 'Preset'}
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
      {inherited ? (
        <Text size={1} muted>
          Following the {inherited.source}.
        </Text>
      ) : null}
    </Stack>
  )
}
