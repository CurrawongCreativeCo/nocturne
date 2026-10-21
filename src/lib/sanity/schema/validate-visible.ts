import type { FieldDefinition, Rule, ValidationBuilder } from 'sanity'

/** Keep stored design choices, but validate only the controls the current choices use. */
export function validateVisible<T extends FieldDefinition>(field: T): T {
  const validation = field.validation as ValidationBuilder<Rule> | Rule | Rule[] | undefined
  return {
    ...field,
    // The second argument defers this rule until Sanity has resolved ancestor visibility too.
    validation: (rule: Rule, context) =>
      context?.hidden
        ? []
        : typeof validation === 'function'
          ? validation(rule, context)
          : (validation ?? rule),
    ...('fields' in field && field.fields ? { fields: field.fields.map(validateVisible) } : {}),
  }
}
