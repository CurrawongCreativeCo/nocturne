import type { ComponentType } from 'react'
import { set, unset, type StringInputProps } from 'sanity'

import { BADGE_ICON_PATHS } from '@/components/ui/badge-icon'
import type { BadgeIconName } from '@/lib/sanity/badge-icons'
import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

import { assignRef } from './preset-picker/assign-ref'
import { normalisePresetOptions } from './preset-picker/options'
import { PickerView } from './preset-picker/picker-view'

/** One drawing per icon, made once, so the grid's pictures keep their identity between renders. */
const thumbnails = new Map<string, ComponentType<PresetThumbnailProps>>()
function iconThumbnail(name: string) {
  let thumbnail = thumbnails.get(name)
  if (!thumbnail) {
    thumbnail = function IconThumbnail({ scheme }: PresetThumbnailProps) {
      return (
        // The site's drawing, sized here: the Studio has no Tailwind classes.
        <svg
          viewBox="0 0 24 24"
          width={32}
          height={32}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
          style={{ color: scheme === 'dark' ? '#e5e7eb' : '#1f2937' }}
        >
          {BADGE_ICON_PATHS[name as BadgeIconName]}
        </svg>
      )
    }
    thumbnails.set(name, thumbnail)
  }
  return thumbnail
}

function NoIconThumbnail() {
  return <span style={{ fontSize: 12, opacity: 0.6 }}>None</span>
}

/** The picker's cards: "No icon", then each icon of the field's list with its drawing. */
export function iconOptions(list: unknown) {
  const icons = normalisePresetOptions(list).map((option) => ({
    ...option,
    thumbnail: iconThumbnail(option.value),
  }))
  return [{ value: 'none', title: 'No icon', thumbnail: NoIconThumbnail }, ...icons]
}

/**
 * An icon field (`options.iconPicker`, see badgeIconField in lib/sanity/schema/badge-icon-field.ts):
 * the shared picture picker (one tab stop, arrow keys, Enter or Space to choose) in its compact size,
 * each card drawing the icon itself above its name, with "No icon" first. Collapsed it shows the
 * chosen icon and a Change button. Studio only: the site draws icons with BadgeIcon alone.
 */
export function IconPickerInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, elementProps } = props
  const options = iconOptions(schemaType.options?.list)
  const stored = typeof value === 'string' && value !== '' ? value : null

  return (
    <PickerView
      compact
      options={options}
      value={stored ?? 'none'}
      label={schemaType.title ?? schemaType.name}
      readOnly={readOnly}
      id={elementProps.id}
      describedBy={elementProps['aria-describedby']}
      focusRef={(element) => {
        assignRef(elementProps.ref, element)
      }}
      onFocus={elementProps.onFocus}
      onBlur={elementProps.onBlur}
      onSelect={(next) => {
        onChange(next === 'none' ? unset() : set(next))
      }}
    />
  )
}
