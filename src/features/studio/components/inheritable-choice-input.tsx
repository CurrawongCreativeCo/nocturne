import { Button, Flex, Text } from '@sanity/ui'
import { set, unset, type StringInputProps } from 'sanity'

/**
 * An optional design choice (`options.inheritable`, see choiceField in
 * src/lib/sanity/schema/surface-design.ts): "Inherit" first, then the field's own options, as one row
 * of buttons like the theme colour choice. Unset shows Inherit as chosen, and choosing Inherit clears
 * the value, so going back to the inherited look is one click and never stores a value of its own.
 * The stored values are the field's `options.list`, so without this input the field is a radio list.
 */
export function InheritableChoiceInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps } = props
  const options = (schemaType.options?.list ?? []) as { value: string; title: string }[]
  const current = typeof value === 'string' && value !== '' ? value : ''
  const inherit = schemaType.options?.inheritable
  const choices = [
    { value: '', title: typeof inherit === 'string' ? inherit : 'Inherit' },
    ...options,
  ]

  return (
    <Flex
      gap={2}
      wrap="wrap"
      role="group"
      aria-label={schemaType.title ?? schemaType.name}
      id={elementProps.id}
      aria-describedby={elementProps['aria-describedby']}
    >
      {choices.map((option, index) => {
        const selected = option.value === current
        return (
          <Button
            key={option.value || 'inherit'}
            ref={index === 0 ? elementProps.ref : undefined}
            mode={selected ? 'default' : 'ghost'}
            tone={selected ? 'primary' : 'default'}
            fontSize={1}
            padding={2}
            disabled={readOnly}
            aria-pressed={selected}
            data-choice={option.value || 'inherit'}
            onClick={() => {
              onChange(option.value === '' ? unset() : set(option.value))
            }}
          >
            <Text size={1}>{option.title}</Text>
          </Button>
        )
      })}
    </Flex>
  )
}
