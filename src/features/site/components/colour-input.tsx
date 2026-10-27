'use client'

import { Badge, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { useState } from 'react'
import { set, unset, useFormValue, type StringInputProps } from 'sanity'

import { describeSuggestion, suggestColour } from '@/lib/color/contrast-remedy'
import { stopContrast, type ColourSet } from '@/lib/color/heading-contrast'
import { HEX_PATTERN } from '@/lib/color/oklch'
import {
  resolveDesignTokens,
  type ContrastCheck,
  type DesignOverrides,
} from '@/lib/color/resolve-design-tokens'
import { headingSectionPath, headingTone } from '@/lib/sanity/heading-text'
import { ContrastFixPanel, type ContrastFixAction } from '@/lib/sanity/schema/contrast-fix-panel'
import { useBrandColours } from '@/lib/sanity/schema/use-brand-colours'

import { defaultColourFor } from '../utils/default-colour'

/** "3266E4" / "#3266E4" -> "#3266e4"; anything else is not a finished colour yet. */
function toHex(text: string): string | null {
  const hex = `#${text.trim().replace(/^#/, '')}`.toLowerCase()
  return HEX_PATTERN.test(hex) ? hex : null
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/** One gradient colour read as large text (3:1) on the tone's background. */
function headingStopCheck(hex: string, tone: string | undefined, site: ColourSet): ContrastCheck {
  const { background, ratio, pass } = stopContrast(tone, hex, site)
  return {
    id: 'heading-stop',
    fields: [],
    label: "Heading text on the section's background",
    foreground: hex,
    background,
    ratio,
    required: 3,
    pass,
    adjustable: true,
  }
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
        {check.pass ? 'Meets target' : 'Below target'} · {check.ratio.toFixed(1)}:1 (needs{' '}
        {check.required}:1)
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
 * suggests the nearest accessible shade by moving OKLCH lightness. With `options.headingStop` (a
 * colour of a heading highlight's custom gradient) the badge is large text, 3:1, on the section's
 * background; a failing colour is only a warning, never blocked. A Custom colour of an element
 * (`options.themeColourHex`) shows no check here: its colour choice above (ThemeColourPickerInput)
 * measures it against the right surface and offers the undoable fixes, so it stays mounted when this
 * field is hidden.
 */
export function ColourInput(props: StringInputProps) {
  const { value, onChange, elementProps, path, readOnly } = props
  const [draft, setDraft] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const document = useFormValue([]) as DesignOverrides | undefined
  const { colours: site } = useBrandColours()
  const [first] = path
  const field = path.length === 1 && typeof first === 'string' ? first : null
  const hex = value && HEX_PATTERN.test(value) ? value.toLowerCase() : null
  const shown = draft ?? value ?? ''
  const defaultHex = hex ? null : defaultColourFor(field, document)
  const invalid = draft !== null && draft.trim() !== '' && toHex(draft) === null

  // A colour of a heading highlight's custom gradient is checked against its section's background.
  const headingStop = props.schemaType.options?.headingStop === true
  const isElement = Boolean(props.schemaType.options?.themeColourHex)
  const section = headingStop ? headingSectionPath(path) : null
  const sectionValue = useFormValue(section ?? ['_type'])
  const tone = section ? headingTone(sectionValue as Parameters<typeof headingTone>[0]) : undefined
  const sectionCheck = hex && headingStop ? headingStopCheck(hex, tone, site) : null

  const checks = sectionCheck
    ? [sectionCheck]
    : field && !isElement
      ? resolveDesignTokens(document).checks.filter((check) => check.fields.includes(field))
      : []
  const fixable = hex ? checks.find((check) => check.adjustable && !check.pass) : undefined
  const suggestion =
    hex && fixable ? suggestColour(hex, fixable.background, fixable.required) : null
  const actions: ContrastFixAction[] =
    suggestion && fixable
      ? [
          {
            id: 'suggest',
            label: 'Use suggested colour',
            detail: describeSuggestion(suggestion, fixable.required),
            after: suggestion.hex,
            apply: () => {
              setDraft(null)
              onChange(set(suggestion.hex))
            },
            undo: () => {
              setDraft(null)
              onChange(set(hex ?? suggestion.hex))
            },
          },
        ]
      : []

  const commit = (text: string) => {
    if (text.trim() === '') {
      onChange(unset())
      if (value) setCleared(true)
    } else {
      const next = toHex(text)
      if (next) {
        setCleared(false)
        onChange(set(next))
      }
    }
  }

  return (
    <Stack gap={3}>
      <Flex align="center" gap={2}>
        <input
          type="color"
          aria-label={`${props.schemaType.title ?? 'Colour'}: colour picker`}
          value={hex ?? defaultHex ?? '#000000'}
          disabled={readOnly}
          onChange={(event) => {
            setDraft(null)
            setCleared(false)
            onChange(set(event.currentTarget.value.toLowerCase()))
          }}
          style={{ width: 44, height: 36, padding: 0, border: 'none', background: 'none' }}
        />
        <div style={{ flex: 1, maxWidth: 160 }}>
          <TextInput
            {...elementProps}
            value={shown}
            placeholder={defaultHex ?? '#3266e4'}
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
        {defaultHex && !draft && (
          <Badge tone="default" fontSize={1}>
            Default
          </Badge>
        )}
        {value && !readOnly && (
          <Button
            mode="bleed"
            tone="default"
            text="Clear"
            fontSize={1}
            onClick={() => {
              setDraft(null)
              onChange(unset())
              setCleared(true)
            }}
          />
        )}
      </Flex>
      {/* Announced to screen readers; the "Default" label shows the same thing visually. */}
      <div role="status" aria-live="polite" style={visuallyHidden}>
        {cleared && defaultHex ? `Cleared. The site uses the default, ${defaultHex}.` : ''}
      </div>
      {defaultHex && (
        <Text size={1} muted>
          {cleared ? 'Cleared: ' : 'Nothing set: '}the site uses the default {defaultHex}.
        </Text>
      )}
      {invalid && (
        <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
          Use a six-digit hex colour such as #3266e4.
        </Text>
      )}
      {hex && checks.length > 0 && (
        <Card padding={2} radius={2} border>
          <Stack gap={2} role="group" aria-label="Contrast checks">
            {checks.map((check) => (
              <CheckBadge key={check.id} check={check} />
            ))}
          </Stack>
        </Card>
      )}
      <ContrastFixPanel actions={actions} current={hex ?? ''} readOnly={readOnly} />
    </Stack>
  )
}
