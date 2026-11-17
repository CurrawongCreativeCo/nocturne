import { Button, Flex, Stack } from '@sanity/ui'
import { unset, type BooleanInputProps } from 'sanity'

/**
 * A switch that can also be cleared (`options.clearable`, the label of the button): Studio's own switch, then one
 * button that unsets the field. Turning a switch off stores false, and Studio's field menu has only Copy and Paste,
 * so without this a saved value (true or false) could never be removed. The button's accessible name is the field's
 * title followed by its visible label, so a screen reader hears which switch it clears. It is disabled while nothing
 * is saved and in read-only mode.
 */
export function ClearableBooleanInput(props: BooleanInputProps) {
  const { schemaType, value, onChange, readOnly } = props
  const label = schemaType.options?.clearable ?? 'Clear'
  const title = schemaType.title ?? schemaType.name
  const saved = typeof value === 'boolean'

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      <Flex>
        <Button
          type="button"
          mode="ghost"
          fontSize={1}
          padding={2}
          text={label}
          aria-label={`${title}: ${label}`}
          disabled={Boolean(readOnly) || !saved}
          data-testid="clearable-boolean-clear"
          onClick={() => {
            onChange(unset())
          }}
        />
      </Flex>
    </Stack>
  )
}
