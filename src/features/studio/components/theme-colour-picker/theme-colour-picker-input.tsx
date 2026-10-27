import { Badge, Button, Flex, Stack, Text } from '@sanity/ui'
import {
  PatchEvent,
  set,
  unset,
  useFormCallbacks,
  useFormValue,
  type StringInputProps,
} from 'sanity'

import {
  describeContrast,
  describeOutcome,
  describeSuggestion,
  suggestColour,
} from '@/lib/color/contrast-remedy'
import type { ColourSet } from '@/lib/color/heading-contrast'
import { themeColourHex } from '@/lib/color/theme-colour-contrast'
import { ContrastFixPanel, type ContrastFixAction } from '@/lib/sanity/schema/contrast-fix-panel'
import { useElementContrast } from '@/lib/sanity/schema/use-element-contrast'
import type { ThemeColour } from '@/lib/sanity/theme-colour'

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
 * The colour choice of a `themeColourField` (lib/sanity/schema/theme-colour.ts): one button per
 * theme colour, each showing the colour this section's tone draws, and a contrast line for the one
 * chosen. Both use the site's Brand colours (Design settings), not tokens.json's, and say so; an
 * element on Glass rows is measured on the glass, over the worst photo. Picking Custom reveals the hex field below; Inherit clears the value. The stored values are
 * the field's own `options.list`, so without this input the field is a plain radio list.
 *
 * A failing choice says which property it is, what it was measured against, the ratio and the
 * target, and offers two undoable fixes: a Custom colour that reaches the target (which overrides the
 * Link list design for that element, and says so), or a reset to the Link list design (Inherit).
 * Nothing changes until one is pressed, and each is measured again straight afterwards: an inherited
 * colour is never assumed to pass. Decoration (a separator, a glow) has no target and says so.
 */
export function ThemeColourPickerInput(props: StringInputProps) {
  const { schemaType, value, onChange, readOnly, path, elementProps } = props
  const options = (schemaType.options?.list ?? []) as { value: ThemeColour; title: string }[]
  const parent = useFormValue(path.slice(0, -1)) as { hex?: string } | undefined
  const current = typeof value === 'string' && value !== '' ? value : 'inherit'
  const { onChange: patchForm } = useFormCallbacks()
  const measured = useElementContrast(props, { colour: current, hex: parent?.hex })
  const { check, tone, decorative } = measured
  const { colours, custom, ready } = measured.brand

  // The suggestion changes two fields (the choice and its hex), so it patches by absolute path.
  const hexPath = [...path.slice(0, -1), 'hex']
  const previousHex = typeof parent?.hex === 'string' ? parent.hex : undefined
  const suggestion =
    check && !check.pass && !measured.onCardBackground
      ? suggestColour(check.foreground, check.background, check.required)
      : null
  const actions: ContrastFixAction[] = []
  if (suggestion && check) {
    actions.push({
      id: 'suggest',
      label: 'Use suggested colour',
      detail: describeSuggestion(suggestion, check.required, { overrides: true }),
      after: `custom:${suggestion.hex}`,
      apply: () => {
        patchForm(PatchEvent.from([set('custom', path), set(suggestion.hex, hexPath)]))
      },
      undo: () => {
        patchForm(
          PatchEvent.from([
            current === 'inherit' ? unset(path) : set(current, path),
            previousHex ? set(previousHex, hexPath) : unset(hexPath),
          ]),
        )
      },
    })
  }
  if (check && !check.pass && current !== 'inherit') {
    actions.push({
      id: 'inherit',
      label: 'Reset to Link list design',
      detail:
        'Clears this choice so the element follows the Link list design again. The inherited colour is measured again afterwards, and may still be below target.',
      after: 'inherit',
      apply: () => {
        onChange(unset())
      },
      undo: () => {
        onChange(set(current))
      },
    })
  }
  // A fresh measurement of the field as it is now, shown right after a fix.
  const outcome = decorative
    ? null
    : check
      ? describeOutcome({
          measured: true,
          property: measured.property,
          against: measured.against,
          ratio: check.ratio,
          required: check.required,
        })
      : measured.inheritUnmeasured
        ? describeOutcome({ measured: false, inherits: measured.inherits ?? 'the design' })
        : null
  const held = current === 'custom' ? `custom:${parent?.hex ?? ''}` : current

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
      {decorative ? (
        <Text size={1} muted>
          {measured.property} is decoration: it carries no meaning, so no contrast target applies.
          If it is the only thing that shows someone where something is, use a colour that reaches
          3:1.
        </Text>
      ) : null}
      {check ? (
        <Flex align="center" gap={2} wrap="wrap">
          <Badge tone={check.pass ? 'positive' : 'caution'} fontSize={1}>
            {check.pass ? 'Meets target' : 'Below target'} · {check.ratio.toFixed(1)}:1
          </Badge>
          <Text size={1} muted>
            {describeContrast({
              property: measured.property,
              against: measured.against,
              ratio: check.ratio,
              required: check.required,
            })}
            {measured.note ? ` ${measured.note}` : ''}
          </Text>
        </Flex>
      ) : null}
      <ContrastFixPanel actions={actions} current={held} outcome={outcome} readOnly={readOnly} />
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
