import type {
  ConditionalProperty,
  ConditionalPropertyCallbackContext,
  ObjectSchemaType,
  Path,
  SanityDocument,
  SanityDocumentLike,
  SchemaType,
  ValidationMarker,
} from 'sanity'

export interface PublishProblem {
  title: string
  message: string
  level: 'error' | 'warning'
  path: Path
  target: Path | null
  hidden?: string
}

/** Mirrors Sanity's validation inspector, with the inspector as a fallback for unavailable fields. */
export function openValidationProblem(
  target: Path | null,
  pane: {
    onPathOpen?: (path: Path) => void
    onFocus?: (path: Path) => void
    openInspector: (name: string) => void
  },
): void {
  if (target && pane.onPathOpen && pane.onFocus) {
    try {
      pane.onPathOpen(target)
      pane.onFocus(target)
      return
    } catch {
      // A stale path should still lead to the existing list of validation problems.
    }
  }
  pane.openInspector('sanity/structure/validation')
}

type Context = Pick<ConditionalPropertyCallbackContext, 'currentUser'> & {
  document: SanityDocumentLike | undefined
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function isHidden(
  hidden: ConditionalProperty,
  context: Omit<ConditionalPropertyCallbackContext, 'document'> & Context,
): boolean {
  try {
    // New in-pane documents can lack timestamps; schema conditions still receive that live value.
    return typeof hidden === 'function'
      ? hidden({ ...context, document: context.document as SanityDocument | undefined })
      : hidden === true
  } catch {
    // A field whose condition cannot be evaluated needs Sanity's inspector, not a guessed fix.
    return true
  }
}

function fields(type: SchemaType) {
  return 'fields' in type ? type.fields : []
}

/** Use schema titles only: removed fields and unknown array types must never expose stored ids. */
export function describeValidationPath(
  schema: ObjectSchemaType,
  path: Path,
  context: Context,
): Pick<PublishProblem, 'title' | 'target' | 'hidden'> {
  let type: SchemaType = schema
  let value: unknown = context.document
  let target: Path | null = path.length ? path : null
  let hidden: string | undefined
  const titles: string[] = []
  const traversed: Path = []

  for (const segment of path) {
    if (typeof segment !== 'string') {
      const items = Array.isArray(value) ? value : []
      if (Array.isArray(segment)) {
        titles.push('Items')
        target = null
        break
      }
      const index =
        typeof segment === 'number'
          ? segment
          : items.findIndex((item) => record(item)._key === segment._key)
      if (index < 0 || index >= items.length) {
        titles.push('Item')
        target = null
        break
      }
      value = items[index]
      const members: SchemaType[] = 'of' in type ? type.of : []
      const member: SchemaType | undefined =
        members.find((item) => item.name === record(value)._type) ??
        (members.length === 1 ? members[0] : undefined)
      if (!member) {
        titles.push('Item')
        target = null
        break
      }
      // The position distinguishes two heroes without showing their internal keys.
      titles.push(
        `${member.title || 'Item'}${items.length > 1 && index >= 0 ? ` (${index + 1})` : ''}`,
      )
      type = member
      traversed.push(segment)
      continue
    }

    const siblings = fields(type)
    const field = siblings.find((item) => item.name === segment)
    if (!field) {
      titles.push('Setting')
      target = null
      break
    }
    const parent = record(value)
    const fieldPath = [...traversed, segment]
    const conditionContext = { ...context, parent, value: parent[segment], path: fieldPath }
    const groupName = Array.isArray(field.group) ? field.group[0] : field.group
    const group =
      'groups' in type ? type.groups?.find((item) => item.name === groupName) : undefined
    const fieldset =
      'fieldsets' in type
        ? type.fieldsets?.find((item) => !item.single && item.name === field.fieldset)
        : undefined
    if (group?.title && titles.at(-1) !== group.title) titles.push(group.title)
    if (fieldset && !fieldset.single && fieldset.title && titles.at(-1) !== fieldset.title)
      titles.push(fieldset.title)
    titles.push(field.type.title || 'Setting')

    const conditions = [field.type.hidden, group?.hidden, fieldset?.hidden]
    const blocking = conditions.filter((condition) => isHidden(condition, conditionContext))
    if (!hidden && blocking.length) {
      // Find a real way out by re-evaluating the condition with each named choice. No schema-name
      // special cases, and never suggest changing a choice unless it reveals this setting.
      let recovery: { current: string; next: string; path: Path } | undefined
      for (const sibling of siblings) {
        if (sibling === field || !sibling.type.title) continue
        const siblingPath = [...traversed, sibling.name]
        if (
          isHidden(sibling.type.hidden, {
            ...context,
            parent,
            value: parent[sibling.name],
            path: siblingPath,
          })
        )
          continue
        if (
          isHidden(sibling.type.readOnly, {
            ...context,
            parent,
            value: parent[sibling.name],
            path: siblingPath,
          })
        )
          continue
        const options = record(sibling.type.options).list
        if (!Array.isArray(options)) continue
        const choices = options.filter(
          (option): option is { title: string; value: unknown } =>
            typeof record(option).title === 'string' && 'value' in record(option),
        )
        const current = choices.find((choice) => choice.value === parent[sibling.name])
        if (!current) continue
        const next = choices.find((choice) =>
          conditions.every(
            (condition) =>
              !isHidden(condition, {
                ...conditionContext,
                parent: { ...parent, [sibling.name]: choice.value },
              }),
          ),
        )
        if (next) {
          recovery = {
            current: `${sibling.type.title}: ${current.title}`,
            next: `Change ${sibling.type.title} to ${next.title}`,
            path: siblingPath,
          }
          break
        }
      }
      hidden = recovery
        ? `This setting is hidden by another choice (${recovery.current}). ${recovery.next} to show it, or ask your agency for help.`
        : 'This setting is hidden in this view. Ask your agency to reveal or correct it before publishing.'
      target = recovery?.path ?? null
    }
    value = parent[segment]
    type = field.type
    traversed.push(segment)
  }
  return { title: titles.join(' › ') || 'Document', target, hidden }
}

/** Sanity's built-in required message needs a verb; custom editorial messages stay intact. */
export function validationWording(message: string, path: Path): string {
  if (/^required\.?$/i.test(message.trim())) return 'Add a value for this field.'
  // Custom validators can accidentally include a stored path or array key. Keep those out of UI.
  const keys = path.flatMap((part) =>
    typeof part === 'object' && '_key' in part ? [part._key] : [],
  )
  const fieldPath = path.filter((part) => typeof part === 'string').join('.')
  if (
    keys.some((key) => message.includes(key)) ||
    (fieldPath.includes('.') && message.includes(fieldPath)) ||
    /\b(_ref|_id|_key)\b|\[_key\s*==/.test(message)
  ) {
    return 'Check this field and correct its value. Ask your agency if you need help.'
  }
  return message.trim() || 'Check this field and correct its value.'
}

export function publishProblems(
  schema: ObjectSchemaType,
  validation: readonly ValidationMarker[],
  context: Context,
): PublishProblem[] {
  return validation.flatMap((marker) =>
    marker.level === 'error' || marker.level === 'warning'
      ? [
          {
            ...describeValidationPath(schema, marker.path, context),
            path: marker.path,
            message: validationWording(marker.message, marker.path),
            level: marker.level,
          },
        ]
      : [],
  )
}
