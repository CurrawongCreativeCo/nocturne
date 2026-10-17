import { Stack } from '@sanity/ui'
import {
  setIfMissing,
  set,
  useCurrentUser,
  type FormPatch,
  type ObjectInputProps,
  type ObjectSchemaType,
} from 'sanity'

import { isClientView } from '@/lib/sanity/roles'
import { getAtPath, matchPreset, splitPath } from '@/lib/sanity/schema/preset-match'

import { normalisePresets } from './options'
import { PickerView } from './picker-view'
import { buildPresetOperations } from './presets'

/** The schema type name of the object at `path` below `schemaType`, for creating it with a `_type`. */
function typeNameAt(schemaType: ObjectSchemaType, path: readonly string[]): string | undefined {
  let current: ObjectSchemaType | undefined = schemaType
  for (const segment of path) {
    const field: ObjectSchemaType['fields'][number] | undefined = current?.fields.find(
      (candidate) => candidate.name === segment,
    )
    current = field?.type.jsonType === 'object' ? field.type : undefined
  }
  return current?.name
}

/**
 * A field's static initial value at `path`: what an unset field holds as far as editors can tell. An
 * object field's own initial value wins over the nested field's (a hero starts with `style.tone`
 * "inverse", whatever the shared style type says), because that is what a new section starts with.
 */
function initialValueAt(schemaType: ObjectSchemaType, path: readonly string[]): unknown {
  let current: ObjectSchemaType | undefined = schemaType
  for (const [index, segment] of path.entries()) {
    const field: ObjectSchemaType['fields'][number] | undefined = current?.fields.find(
      (candidate) => candidate.name === segment,
    )
    if (!field) return undefined
    const initial: unknown =
      typeof field.type.initialValue === 'function' ? undefined : field.type.initialValue
    if (index === path.length - 1) return initial
    if (initial !== null && typeof initial === 'object') {
      const inherited = getAtPath(initial, path.slice(index + 1))
      if (inherited !== undefined) return inherited
    }
    current = field.type.jsonType === 'object' ? field.type : undefined
  }
  return undefined
}

/**
 * The preset bar for an object type with `options.presets` (see presetsOption in
 * src/lib/sanity/schema/preset-field.ts): shown above the object's normal form. A preset sets
 * several fields at once through the object's own `onChange`, as patches relative to the object, so
 * undo, drafts and real-time collaboration treat them like any edit. Presets set values once; the
 * fields stay editable, and the bar shows "Custom" as soon as they no longer match one. Presets
 * choose a design, so clients (and the agency's client-view preview) get the plain form without
 * them, like the other design controls.
 */
export function PresetBarInput(props: ObjectInputProps) {
  const { schemaType, value, onChange, readOnly } = props
  const user = useCurrentUser()
  const presets = normalisePresets(
    (schemaType.options as { presets?: unknown } | undefined)?.presets,
  )

  if (isClientView(user)) return props.renderDefault(props)

  const defaults = Object.fromEntries(
    presets.flatMap((preset) =>
      Object.keys(preset.set).map((key) => [key, initialValueAt(schemaType, splitPath(key))]),
    ),
  )
  const current = matchPreset(presets, value, defaults)

  function apply(presetValue: string) {
    const preset = presets.find((candidate) => candidate.value === presetValue)
    if (!preset) return
    const patches: FormPatch[] = []
    if (value === undefined) patches.push(setIfMissing({ _type: schemaType.name }))
    for (const operation of buildPresetOperations(preset, value, {
      typeAt: (path) => typeNameAt(schemaType, path),
    })) {
      patches.push(
        operation.type === 'set'
          ? set(operation.value, operation.path)
          : setIfMissing(operation.value, operation.path),
      )
    }
    if (patches.length > 0) onChange(patches)
  }

  return (
    <Stack gap={4}>
      <PickerView
        options={presets}
        value={current?.value ?? null}
        label={`${schemaType.title ?? schemaType.name} presets`}
        readOnly={readOnly}
        onSelect={apply}
        unmatched={{ title: 'Custom', description: 'The fields below no longer match a preset.' }}
      />
      {props.renderDefault(props)}
    </Stack>
  )
}
