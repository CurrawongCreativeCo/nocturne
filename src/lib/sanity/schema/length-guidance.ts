interface WarnableRule<R> {
  max: (limit: number) => R
  warning: (message?: string) => R
}

/** Warning text for text longer than the design handles. */
export function lengthMessage(label: string, max: number): string {
  return `${label} over ${max} characters may not fit the design well. Shorter reads better.`
}

/**
 * Warns (never blocks publishing) when a heading or intro runs past what its design handles.
 * Return it next to other rules: `validation: (rule) => [rule.required(), lengthWarning(rule, 70, 'Headings')]`.
 * Each section records its limits in a `LIMITS` constant beside its schema.
 */
export function lengthWarning<R extends WarnableRule<R>>(rule: R, max: number, label: string): R {
  return rule.max(max).warning(lengthMessage(label, max))
}
