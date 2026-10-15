'use client'

import { Card, Stack, Text } from '@sanity/ui'
import { useState } from 'react'

import type { PresetDefinition, PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

import { PickerView } from '../components/preset-picker/picker-view'
import { buildPresetOperations, getAtPath, matchPreset } from '../components/preset-picker/presets'

/** Sample artwork: inline SVG that follows the scheme (`currentColor`), so both modes are covered. */
function Bars({ rows, selected }: PresetThumbnailProps & { rows: number[] }) {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" style={{ color: 'inherit' }}>
      {rows.map((width, index) => {
        const y = 18 + index * 18
        return (
          <rect
            key={y}
            x={(120 - width) / 2}
            y={y}
            width={width}
            height={10}
            rx={3}
            fill="currentColor"
            opacity={selected ? 0.9 : 0.5}
          />
        )
      })}
    </svg>
  )
}
const Split = (props: PresetThumbnailProps) => <Bars {...props} rows={[80, 56, 68]} />
const Centred = (props: PresetThumbnailProps) => <Bars {...props} rows={[40, 70, 40]} />

const LAYOUTS = [
  { value: 'split', title: 'Split', description: 'Picture beside the text.', thumbnail: Split },
  { value: 'centred', title: 'Centred', description: 'Text in the middle.', thumbnail: Centred },
  // A static file, to cover pictures that are not inline components.
  { value: 'icon', title: 'Icon', description: 'A static picture.', thumbnail: '/icon.png' },
  { value: 'plain', title: 'Plain', description: 'No thumbnail at all.' },
]

const PRESETS: (PresetDefinition & { thumbnail: PresetDefinition['thumbnail'] })[] = [
  {
    value: 'feature',
    title: 'Feature',
    description: 'Split layout on a soft band.',
    thumbnail: Split,
    set: { variant: 'split', 'style.tone': 'alt' },
  },
  {
    value: 'statement',
    title: 'Statement',
    description: 'Centred on the page colour.',
    thumbnail: Centred,
    set: { variant: 'centred', 'style.tone': 'surface' },
  },
]

const TONES = ['surface', 'alt', 'inverse', 'accent']

function Example({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Card padding={4} radius={3} border data-picker-example={id}>
      <Stack gap={4}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        {children}
      </Stack>
    </Card>
  )
}

/**
 * The preset picker's two modes, in memory (no Studio form), for the accessibility and screenshot
 * tests: an option picker with nothing chosen (the grid), the same chosen (the collapsed row), and
 * a preset bar that shows "Custom" once a field is changed by hand.
 */
export function PickerExamples() {
  const [layout, setLayout] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>('centred')
  const [section, setSection] = useState<Record<string, unknown>>({
    variant: 'split',
    style: { tone: 'alt' },
  })

  const current = matchPreset(PRESETS, section)
  const tone = getAtPath(section, ['style', 'tone'])

  return (
    <Stack gap={5} data-picker-examples="">
      <Example id="options" title="Option picker: nothing chosen yet">
        <PickerView options={LAYOUTS} value={layout} label="Layout" onSelect={setLayout} />
      </Example>
      <Example id="options-collapsed" title="Option picker: collapsed">
        <PickerView
          options={LAYOUTS}
          value={chosen}
          label="Layout (collapsed)"
          onSelect={setChosen}
        />
      </Example>
      <Example id="presets" title="Preset bar">
        <PickerView
          options={PRESETS}
          value={current?.value ?? null}
          label="Section presets"
          unmatched={{ title: 'Custom', description: 'The fields below no longer match a preset.' }}
          onSelect={(value) => {
            const preset = PRESETS.find((candidate) => candidate.value === value)
            if (!preset) return
            // The same operations the Studio input patches with, applied to a plain object.
            let next: Record<string, unknown> = { ...section }
            for (const operation of buildPresetOperations(preset, section)) {
              const [head, ...rest] = operation.path
              if (head === undefined) continue
              next =
                rest.length === 0
                  ? { ...next, [head]: operation.value }
                  : {
                      ...next,
                      [head]: { ...(next[head] as object), [rest.join('.')]: operation.value },
                    }
            }
            setSection(next)
          }}
        />
        <label>
          <Text size={1} as="span">
            Tone, set by hand{' '}
          </Text>
          <select
            data-preset-tone=""
            value={typeof tone === 'string' ? tone : ''}
            onChange={(event) => {
              setSection({ ...section, style: { tone: event.target.value } })
            }}
          >
            {TONES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <Text size={0} muted data-preset-values="">
          {JSON.stringify(section)}
        </Text>
      </Example>
    </Stack>
  )
}
