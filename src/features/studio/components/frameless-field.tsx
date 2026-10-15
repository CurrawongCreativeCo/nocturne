import type { FieldProps } from 'sanity'

import { GradientField } from './gradient-picker/gradient-field'

/**
 * The Studio-wide field override (`form.components.field`): an object type with `options.frameless`
 * (the shared section design) shows its fields directly, without the title and frame Studio draws
 * around a nested object. A gradient picker field (`options.gradientPicker`) disappears while there
 * are no gradients to pick. Stored data is unchanged; every other field renders as usual.
 */
export function FramelessAwareField(props: FieldProps) {
  if (
    props.schemaType.jsonType === 'object' &&
    (props.schemaType.options as { frameless?: boolean } | undefined)?.frameless === true
  ) {
    return <>{props.children}</>
  }
  if (props.schemaType.jsonType === 'string' && props.schemaType.options?.gradientPicker === true) {
    return <GradientField {...props} />
  }
  return props.renderDefault(props)
}
