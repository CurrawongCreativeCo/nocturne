import type { FieldProps } from 'sanity'

/**
 * The Studio-wide field override (`form.components.field`): an object type with `options.frameless`
 * (the shared section design) shows its fields directly, without the title and frame Studio draws
 * around a nested object. Stored data is unchanged; every other field renders as usual.
 */
export function FramelessAwareField(props: FieldProps) {
  if (
    props.schemaType.jsonType === 'object' &&
    (props.schemaType.options as { frameless?: boolean } | undefined)?.frameless === true
  ) {
    return <>{props.children}</>
  }
  return props.renderDefault(props)
}
