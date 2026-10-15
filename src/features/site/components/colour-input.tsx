'use client'

import { Badge, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { useState } from 'react'
import { set, unset, useFormValue, type StringInputProps } from 'sanity'

import { adjustLightnessForContrast } from '@/lib/color/contrast'
import { HEX_PATTERN } from '@/lib/color/oklch'

import {
  resolveDesignTokens,
  type ContrastCheck,
  type DesignOverrides,
} from '../utils/resolve-design-tokens'

/** "3266E4" / "#3266E4" -> "#3266e4"; anything else is not a finished colour yet. */
function toHex(text: string): string | null {
  const hex = `#${text.trim().replace(/^#/, '')}`.toLowerCase()
  return HEX_PATTERN.test(hex) ? hex : null
}

function CheckBadge({ check }: { check: ContrastCheck }) {
  return (
    <Flex align="center" gap={2}>
      {/* The colours are the editor's own, so they are inline on purpose (not Studio theme colours). */}
      <span
        aria-hidden="true"
        style={{
          background: check.background,
          color: check.foreground,
          border: '1px solid rgba(128,128,128,0.4)',
          borderRadius: 4,
          fontWeight: 700,
          fontSize: 12,
          lineHeight: '20px',
          width: 28,
          textAlign: 'center',
        }}
      >
        Aa
      </span>
      <Badge tone={check.pass ? 'positive' : 'critical'} fontSize={1}>
        {check.pass ? 'AA pass' : 'AA fail'} · {check.ratio.toFixed(1)}:1
      </Badge>
      <Text size={1} muted>
        {check.label}
      </Text>
    </Flex>
  )
}

/**
 * A colour as a native picker plus a hex field, stored as "#rrggbb". Below it, contrast badges for
 * the colours it sits on (from resolveDesignTokens, the same code the site runs), and a button that
 * suggests the nearest accessible shade by moving OKLCH lightness.
 */
export function ColourInput(props: StringInputProps) {
  const { value, onChange, elementProps, path, readOnly } = props
  const [draft, setDraft] = useState<string | null>(null)
  const document = useFormValue([]) as DesignOverrides | undefined
  const [first] = path
  const field = path.length === 1 && typeof first === 'string' ? first : null
  const hex = value && HEX_PATTERN.test(value) ? value.toLowerCase() : null
  const shown = draft ?? value ?? ''
  const invalid = draft !== null && draft.trim() !== '' && toHex(draft) === null

  const checks = field
    ? resolveDesignTokens(document).checks.filter((check) => check.fields.includes(field))
    : []
  const fixable = hex ? checks.find((check) => check.adjustable && !check.pass) : undefined
  const suggestion =
    hex && fixable ? adjustLightnessForContrast(hex, fixable.background, fixable.required) : null

  const commit = (text: string) => {
    if (text.trim() === '') onChange(unset())
    else {
      const next = toHex(text)
      if (next) onChange(set(next))
    }
  }

  return (
    <Stack gap={3}>
      <Flex align="center" gap={2}>
        <input
          type="color"
          aria-label={`${props.schemaType.title ?? 'Colour'}: colour picker`}
          value={hex ?? '#000000'}
          disabled={readOnly}
          onChange={(event) => {
            setDraft(null)
            onChange(set(event.currentTarget.value.toLowerCase()))
          }}
          style={{ width: 44, height: 36, padding: 0, border: 'none', background: 'none' }}
        />
        <div style={{ flex: 1, maxWidth: 160 }}>
          <TextInput
            {...elementProps}
            value={shown}
            placeholder="#3266e4"
            maxLength={7}
            spellCheck={false}
            readOnly={readOnly}
            customValidity={invalid ? 'Use a six-digit hex colour such as #3266e4' : undefined}
            onChange={(event) => {
              const text = event.currentTarget.value
              setDraft(text)
              commit(text)
            }}
            onBlur={(event) => {
              setDraft(null)
              elementProps.onBlur(event)
            }}
          />
        </div>
        {value && !readOnly && (
          <Button
            mode="bleed"
            tone="default"
            text="Clear"
            fontSize={1}
            onClick={() => {
              setDraft(null)
              onChange(unset())
            }}
          />
        )}
      </Flex>
      {invalid && (
        <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
          Use a six-digit hex colour such as #3266e4.
        </Text>
      )}
      {hex && checks.length > 0 && (
        <Card padding={2} radius={2} border>
          <Stack gap={2} role="group" aria-label="Contrast against WCAG 2.2 AA">
            {checks.map((check) => (
              <CheckBadge key={check.id} check={check} />
            ))}
          </Stack>
        </Card>
      )}
      {suggestion?.adjusted && !readOnly && (
        <div>
          <Button
            mode="ghost"
            tone="primary"
            fontSize={1}
            text={`Suggest an accessible shade (${suggestion.hex})`}
            onClick={() => {
              setDraft(null)
              onChange(set(suggestion.hex))
            }}
          />
        </div>
      )}
    </Stack>
  )
}
