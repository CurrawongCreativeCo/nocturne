import { Badge, Button, Flex, Stack, Text } from '@sanity/ui'
import { set, unset, useFormValue, type StringInputProps } from 'sanity'

import {
  cardLabelHex,
  cardTextContrast,
  layeredCardSurface,
  type StoredCardSurface,
} from '@/lib/color/card-contrast'
import { glassRowsStrength } from '@/lib/color/glass-contrast'
import type { ColourSet } from '@/lib/color/heading-contrast'
import { themeColourContrast, themeColourHex } from '@/lib/color/theme-colour-contrast'
import { headingTone } from '@/lib/sanity/heading-text'
import { itemPathOf, sectionPathOf } from '@/lib/sanity/schema/theme-colour'
import { useBrandColours } from '@/lib/sanity/schema/use-brand-colours'
import type { ThemeColour } from '@/lib/sanity/theme-colour'

interface Section {
  _type?: string
  style?: { tone?: string; image?: { asset?: unknown } } | null
  variant?: string
  rowStyle?: string
  glassStrength?: string
  cardDesign?: StoredCardSurface
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
  if (colour === 'transparent') {
    // A checkerboard: "no fill".
    return (
      <span
        aria-hidden="true"
        style={{
          ...base,
          background: 'repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 8px 8px',
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
 * The check for a card's text or background colour: the field's choice put into its own level (the
 * list's Cards box, or the link's Appearance when `own` is given), layered, and measured on the card's
 * background (lib/color/card-contrast.ts). Null when the card's background is the layout's own.
 */
function cardCheck({
  onCard,
  current,
  hex,
  list,
  own,
  path,
  tone,
  glass,
  site,
}: {
  onCard: 'text' | 'background'
  current: string
  hex: string | undefined
  list: StoredCardSurface | undefined
  own: StoredCardSurface | undefined
  path: readonly unknown[]
  tone: string | undefined
  glass: ReturnType<typeof glassRowsStrength>
  site: ColourSet
}) {
  const choice = { colour: current, hex }
  // Text sits in eyebrow, label or description: the label's colour is what the background check reads.
  const element = path[path.length - 2]
  const put = (level: StoredCardSurface | undefined): StoredCardSurface =>
    onCard === 'background'
      ? { ...level, background: choice }
      : element === 'label'
        ? { ...level, label: { colour: choice } }
        : (level ?? {})
  const surface = own
    ? layeredCardSurface(list, put(own))
    : layeredCardSurface(put(list), undefined)
  const foreground =
    onCard === 'background'
      ? cardLabelHex(surface, tone, site)
      : themeColourHex(current, hex, tone, site)
  if (!foreground) return null
  const result = cardTextContrast({ foreground, surface, tone, glass, site })
  if (!result) return null
  const required = 4.5
  return {
    foreground,
    background: result.background,
    ratio: result.ratio,
    required,
    pass: result.ratio >= required,
    suggestion: null,
  }
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
  const inItem = schemaType.options?.themeColourInItem === true
  const sectionPath = sectionPathOf(path, { inItem })
  const section = useFormValue(sectionPath ?? ['_type']) as Section | undefined
  const tone = sectionPath ? headingTone(section) : undefined
  const parent = useFormValue(path.slice(0, -1)) as { hex?: string } | undefined
  const current = typeof value === 'string' && value !== '' ? value : 'inherit'
  const { colours, custom, ready } = useBrandColours()
  const rowsGlass = glassRowsStrength(section)
  const glass = schemaType.options?.themeColourRows ? rowsGlass : null
  // A card's text or background: measured on the card as the list and the link layer it.
  const onCard = schemaType.options?.themeColourCard
  const itemPath = inItem ? itemPathOf(path) : null
  const item = useFormValue(itemPath ?? ['_type']) as
    { design?: StoredCardSurface & { appearance?: string } } | undefined
  const card = onCard
    ? cardCheck({
        onCard,
        current,
        hex: parent?.hex,
        // The field's own level: the link's Appearance, or the list's Cards box.
        list: section?.cardDesign,
        own: itemPath ? (item?.design?.appearance === 'custom' ? item.design : {}) : undefined,
        path,
        tone,
        glass: rowsGlass,
        site: colours,
      })
    : null
  const check =
    card ?? themeColourContrast(current, parent?.hex, tone, usage, { site: colours, glass })
  const overPicture = !glass && !card && Boolean(section?.style?.image?.asset)

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
            {card
              ? onCard === 'background'
                ? ' The label, measured on this card background.'
                : ' Measured on the card’s background.'
              : glass
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
