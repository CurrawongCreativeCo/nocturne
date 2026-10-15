import type { FieldProps } from 'sanity'

import { useBrandGradients } from './use-brand-gradients'

/**
 * The field wrapper for the Gradient picker: it draws nothing while Design settings has no
 * gradients (an editor with nothing to choose isn't shown the question), unless a value is already
 * stored, which stays visible so it can be cleared.
 */
export function GradientField(props: FieldProps) {
  const gradients = useBrandGradients()
  const stored = 'value' in props && typeof props.value === 'string' && props.value !== ''
  if (!stored && (gradients === null || gradients.length === 0)) return null
  return props.renderDefault(props)
}
