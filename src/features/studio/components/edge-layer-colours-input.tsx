import { Button, Flex, Stack } from '@sanity/ui'
import { unset, type ObjectInputProps } from 'sanity'

import {
  SECTION_EDGE_LAYER_RESET,
  SECTION_EDGE_LAYER_SLOTS,
} from '@/lib/sanity/section-style-options'

/** Whether any of the six per-layer fields holds a value (an empty or missing object is the recipe). */
export function hasLayerOverrides(value: unknown): boolean {
  const stored = value as Record<string, unknown> | null | undefined
  return SECTION_EDGE_LAYER_SLOTS.some((slot) => !!stored?.[slot] || !!stored?.[`${slot}Strength`])
}

/**
 * The section edge's Layer colours (`style.edgeLayerColours`, task 151, Slice 8; `options.layerOverridesReset`): the
 * default fields, each cleared by its own first choice ("Use recipe colour", "Use Layer strength"), and one labelled
 * button under them that unsets the whole object in a single patch on its own path, so every other style setting is
 * left as it is. It is disabled while nothing is stored and in read-only mode.
 */
export function EdgeLayerColoursInput(props: ObjectInputProps) {
  const { value, onChange, readOnly } = props
  const stored = hasLayerOverrides(value)

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      <Flex>
        <Button
          type="button"
          mode="ghost"
          fontSize={1}
          padding={2}
          text={SECTION_EDGE_LAYER_RESET}
          disabled={Boolean(readOnly) || !stored}
          data-testid="edge-layer-colours-reset"
          onClick={() => {
            onChange(unset())
          }}
        />
      </Flex>
    </Stack>
  )
}
