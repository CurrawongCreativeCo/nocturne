import { Badge, Button, Flex, Stack, Text } from '@sanity/ui'
import { set, unset, useFormValue, type StringInputProps } from 'sanity'

import { glassRowsStrength } from '@/lib/color/glass-contrast'
import type { ColourSet } from '@/lib/color/heading-contrast'
import { themeColourContrast, themeColourHex } from '@/lib/color/theme-colour-contrast'
import { headingTone } from '@/lib/sanity/heading-text'
import { sectionPathOf } from '@/lib/sanity/schema/theme-colour'
import { useBrandColours } from '@/lib/sanity/schema/use-brand-colours'
import type { ThemeColour } from '@/lib/sanity/theme-colour'

interface Section {
  _type?: string
  style?: { tone?: string; image?: { asset?: unknown } } | null
  variant?: string
  rowStyle?: string
  glassStrength?: string
}

/** The dot on each choice: the colour the page draws on this section's tone. */
function Swatch({
  colour,
  hex,
  tone,
  site,
}: {
  colour: string
  hex?: string
  tone?: string
  site: ColourSet
}) {
  const fill = themeColourHex(colour, hex, tone, site)
  const base = {
    display: 'inline-block',
    width: 16,
    height: 16,
    borderRadius: 999,
    border: '1px solid rgba(128,128,128,0.5)',
    flexShrink: 0,
  } as const
  if (colour === 'inherit') {
    // Half and half: "whatever the component uses".
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background: 'linear-gradient(135deg, currentColor 50%, transparent 50%)',
        }}
      />
    )
  }
  if (colour === 'custom' && !fill) {
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background: 'conic-gradient(#e11d48, #f59e0b, #22c55e, #3b82f6, #a855f7, #e11d48)',
        }}
      />
    )
  }
  return <span aria-hidden="true" style={{ ...base, background: fill ?? 'transparent' }} />
}

/**
 * The colour choice of a `themeColourField` (lib/sanity/schema/theme-colour.ts): one button per
 * theme colour, each showing the colour this section's tone draws, and a contrast line for the one
 * chosen. Both use the site's Brand colours (Design settings), not tokens.json's, and say so; an
 * element on Glass rows is measured on the glass, over the worst photo. Picking Custom reveals the hex field below; Inherit clears the value. The stored values are
 * the field's own `options.list`, so without this input the field is a plain radio list.
 */
export function ThemeColourPickerInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, path, elementProps } = props
  const usage = schemaType.options?.themeColourPicker ?? 'graphic'
  const options = (schemaType.options?.list ?? []) as { value: ThemeColour; title: string }[]
  const sectionPath = sectionPathOf(path)
  const section = useFormValue(sectionPath ?? ['_type']) as Section | undefined
  const tone = sectionPath ? headingTone(section) : undefined
  const parent = useFormValue(path.slice(0, -1)) as { hex?: string } | undefined
  const current = typeof value === 'string' && value !== '' ? value : 'inherit'
  const { colours, custom, ready } = useBrandColours()
  const glass = schemaType.options?.themeColourRows ? glassRowsStrength(section) : null
  const check = themeColourContrast(current, parent?.hex, tone, usage, { site: colours, glass })
  const overPicture = !glass && Boolean(section?.style?.image?.asset)

  return (
    <Stack gap={3}>
      <Flex
        gap={2}
        wrap="wrap"
        role="group"
        aria-label={schemaType.title ?? 'Colour'}
        id={elementProps.id}
        aria-describedby={elementProps['aria-describedby']}
      >
        {options.map((option) => {
          const selected = option.value === current
          return (
            <Button
              key={option.value}
              mode={selected ? 'default' : 'ghost'}
              tone={selected ? 'primary' : 'default'}
              fontSize={1}
              padding={2}
              disabled={readOnly}
              aria-pressed={selected}
              onClick={() => {
                onChange(option.value === 'inherit' ? unset() : set(option.value))
              }}
            >
              <Flex align="center" gap={2}>
                <Swatch colour={option.value} hex={parent?.hex} tone={tone} site={colours} />
                <Text size={1}>{option.title}</Text>
              </Flex>
            </Button>
          )
        })}
      </Flex>
      {check && current !== 'custom' ? (
        <Flex align="center" gap={2} wrap="wrap">
          <Badge tone={check.pass ? 'positive' : 'caution'} fontSize={1}>
            {check.pass ? 'AA pass' : 'Low contrast'} · {check.ratio.toFixed(1)}:1
          </Badge>
          <Text size={1} muted>
            {check.pass
              ? `${usage === 'text' ? 'Readable' : 'Clear'} on this section’s background.`
              : `Needs ${check.required}:1 on this section’s background. Pick another colour, or a different background.`}
            {glass
              ? ' Measured on the glass, over the lightest or darkest part of a photo.'
              : overPicture
                ? ' Measured on the background colour; check it over the picture too.'
                : ''}
          </Text>
        </Flex>
      ) : null}
      {ready ? (
        <Text size={1} muted>
          {custom
            ? 'Swatches and contrast use this site’s Brand colours (Design settings).'
            : 'Swatches and contrast use the default colours: Design › Brand colours has nothing changed.'}
        </Text>
      ) : null}
    </Stack>
  )
}
