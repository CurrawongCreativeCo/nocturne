import { Button, Flex, Stack, Text } from '@sanity/ui'
import { set, useFormValue, type StringInputProps } from 'sanity'

import { collectAnchorIds } from './collect-anchors'

/**
 * A link's "Section" field: the normal text box, plus a button for each anchor already set on
 * this document's sections. Typing still works for anchors elsewhere (shared sections, a
 * section not yet given one).
 */
export function AnchorPickerInput(props: StringInputProps) {
  const document = useFormValue([])
  const anchors = collectAnchorIds(document)

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      {anchors.length > 0 ? (
        <Stack gap={2}>
          <Text size={1} muted>
            Sections on this page
          </Text>
          <Flex gap={2} wrap="wrap">
            {anchors.map((id) => (
              <Button
                key={id}
                text={`#${id}`}
                mode="ghost"
                fontSize={1}
                padding={2}
                tone={props.value === id ? 'primary' : 'default'}
                selected={props.value === id}
                onClick={() => {
                  props.onChange(set(id))
                }}
              />
            ))}
          </Flex>
        </Stack>
      ) : (
        <Text size={1} muted>
          No section on this page has an anchor yet. Set one in a section’s Layout options, or type
          it here.
        </Text>
      )}
    </Stack>
  )
}
