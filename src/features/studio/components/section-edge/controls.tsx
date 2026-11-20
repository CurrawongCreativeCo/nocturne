import { Stack, Text } from '@sanity/ui'
import { useId, type ReactNode } from 'react'

/**
 * The editor's small form controls. Native inputs, each with a visible label, so every control has a name and
 * works with the keyboard and a screen reader without Studio's own field wrappers. `control` is the id a problem
 * points at (`data-edge-control`).
 */

const box = { display: 'block', width: '100%' } as const

export function Group({
  legend,
  hint,
  children,
}: {
  legend: string
  hint?: string
  children: ReactNode
}) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <Stack gap={3}>
        <legend style={{ padding: 0 }}>
          <Text size={1} weight="semibold">
            {legend}
          </Text>
        </legend>
        {hint && (
          <Text size={1} muted>
            {hint}
          </Text>
        )}
        {children}
      </Stack>
    </fieldset>
  )
}

export function ChoiceRow<T extends string>({
  legend,
  control,
  value,
  options,
  onChange,
  disabled,
}: {
  legend: string
  control: string
  value: T | undefined
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset
      data-edge-control={control}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
      disabled={disabled}
    >
      <legend style={{ padding: 0, marginBottom: 6 }}>
        <Text size={1} weight="medium">
          {legend}
        </Text>
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        {options.map((option) => (
          <label
            key={option.value}
            style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value)
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SliderRow({
  label,
  control,
  value,
  min,
  max,
  step = 1,
  unit = '%',
  onChange,
  disabled,
  hint,
}: {
  label: string
  control: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  return (
    <div data-edge-control={control}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
        {label}
      </label>
      {hint && (
        <div id={`${id}-hint`} style={{ fontSize: 12, opacity: 0.7 }}>
          {hint}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={`${String(value)}${unit}`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => {
            onChange(Number(event.currentTarget.value))
          }}
          style={{ flex: 1 }}
        />
        <span style={{ minWidth: 48, fontSize: 13, textAlign: 'right' }}>
          {value}
          {unit}
        </span>
      </div>
    </div>
  )
}

export function SelectRow<T extends string>({
  label,
  control,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  control: string
  value: T | undefined
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div data-edge-control={control}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.value as T)
        }}
        style={{ ...box, padding: 6, fontSize: 13 }}
      >
        {value === undefined && <option value="">Choose…</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function NumberCell({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <input
      type="number"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      step={1}
      disabled={disabled}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber
        if (Number.isFinite(next)) onChange(next)
      }}
      style={{ width: 64, padding: 4, fontSize: 13 }}
    />
  )
}
