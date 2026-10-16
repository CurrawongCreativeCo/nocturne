import type { ComponentType } from 'react'
import {
  defineField,
  type ConditionalProperty,
  type Path,
  type StringRule,
  type ValidationBuilder,
} from 'sanity'

/** What a thumbnail component receives: the Studio scheme it draws on, and whether its card is chosen. */
export interface PresetThumbnailProps {
  scheme: 'light' | 'dark'
  selected: boolean
}

/** A picture for an option: a URL or static file path, or an inline (theme-aware) React component. */
export type PresetThumbnail = string | ComponentType<PresetThumbnailProps>

export interface PresetOption {
  /** Stored in the content. */
  value: string
  title: string
  /** One line under the title. */
  description?: string
  thumbnail?: PresetThumbnail
}

/** One-click preset: sets several fields at once. Editors can still change any of them afterwards. */
export interface PresetDefinition {
  value: string
  title: string
  description?: string
  thumbnail?: PresetThumbnail
  /** Field path (dots reach into objects: 'style.tone') to the value it is set to. */
  set: Record<string, unknown>
}

/** Where a picker field sits, for options that depend on the rest of the form. */
export interface PresetOptionsContext {
  document: unknown
  path: Path
}

declare module 'sanity' {
  interface StringOptions {
    /** Show the options as a grid of pictures. The Studio input is in features/studio/components/preset-picker. */
    presetPicker?: boolean
    /** Offer the anchors of the document's sections beside a text box (features/studio/components/anchor-picker). */
    anchorPicker?: boolean
    /**
     * The values to offer right now (Parallax only where there is a picture). The stored value is
     * always shown, so a choice left over from another layout stays visible rather than vanishing.
     */
    visibleOptions?: (context: PresetOptionsContext) => readonly string[]
    /**
     * The option the site uses while nothing is stored, so the picker can show it as chosen
     * (an overlay left unset follows the background). Nothing is written until the editor picks.
     */
    defaultValue?: (context: PresetOptionsContext) => string | undefined
  }
  interface ObjectOptions {
    /** Presets shown in a bar above the object's fields (features/studio/components/preset-picker). */
    presets?: PresetDefinition[]
  }
}

interface PresetFieldConfig {
  name: string
  title?: string
  description?: string
  group?: string
  options: readonly PresetOption[]
  /** Defaults to the first option. */
  initialValue?: string
  required?: boolean
  fieldset?: string
  hidden?: ConditionalProperty
  /** Replaces the default (`required`) validation. */
  validation?: ValidationBuilder<StringRule, string>
  visibleOptions?: (context: PresetOptionsContext) => readonly string[]
  defaultValue?: (context: PresetOptionsContext) => string | undefined
}

/**
 * A string field the Studio shows as a picker of pictures instead of a radio list. The options go in
 * `options.list`, so without the picker input (a Studio that doesn't register it) the field is still
 * a normal radio list. Schema files stay free of Studio code: the picker finds the field by
 * `options.presetPicker`.
 */
export function presetField({
  name,
  title,
  description,
  group,
  options,
  initialValue,
  required = true,
  fieldset,
  hidden,
  validation,
  visibleOptions,
  defaultValue,
}: PresetFieldConfig) {
  return defineField({
    name,
    title,
    description,
    group,
    fieldset,
    hidden,
    type: 'string',
    initialValue: initialValue ?? options[0]?.value,
    options: {
      presetPicker: true,
      // `description` and `thumbnail` ride along on each entry; Sanity ignores what it doesn't know.
      list: options.map((option) => ({ ...option })),
      layout: 'radio',
      visibleOptions,
      defaultValue,
    },
    validation: validation ?? (required ? (rule) => rule.required() : undefined),
  })
}

/**
 * The `options` for an object type (a section, say) that offers presets above its form:
 * `defineType({ type: 'object', options: presetsOption([...]), ... })`.
 */
export function presetsOption(presets: readonly PresetDefinition[]) {
  return { presets: [...presets] }
}
