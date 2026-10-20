import { CheckmarkIcon } from '@sanity/icons/Checkmark'
import { Box, Card, Flex, Stack, Text, useRootTheme } from '@sanity/ui'
import {
  useId,
  useRef,
  useState,
  type FocusEventHandler,
  type KeyboardEvent,
  type RefCallback,
} from 'react'

import type { PresetThumbnail } from '@/lib/sanity/schema/preset-field'

import { nextFocusIndex } from './presets'

export interface GridOption {
  value: string
  title: string
  description?: string
  thumbnail?: PresetThumbnail
}

/**
 * A picture at 4:3. A string is a static file or URL, drawn to fill the box; a component is drawn
 * inline and told the scheme, so it can follow light and dark. With no thumbnail the box shows the
 * option's first letter, so a card is never blank.
 */
export function OptionThumbnail({
  option,
  selected = false,
}: {
  option: GridOption
  selected?: boolean
}) {
  const { scheme } = useRootTheme()
  const { thumbnail } = option
  return (
    <Card
      tone="transparent"
      border
      radius={2}
      data-thumbnail=""
      style={{ aspectRatio: '4 / 3', overflow: 'hidden', width: '100%' }}
    >
      <Flex
        align="center"
        justify="center"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        {typeof thumbnail === 'string' ? (
          // The picture is decoration: the card's title names the option.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : thumbnail ? (
          (() => {
            const Thumbnail = thumbnail
            return <Thumbnail scheme={scheme === 'dark' ? 'dark' : 'light'} selected={selected} />
          })()
        ) : (
          <Text size={3} weight="semibold" muted>
            {option.title.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </Flex>
    </Card>
  )
}

interface OptionGridProps {
  options: readonly GridOption[]
  /** The chosen option's value, or null when none is (a preset bar showing "Custom"). */
  value: string | null
  onSelect: (value: string) => void
  /** Names the group for screen readers: the field's title. */
  label: string
  readOnly?: boolean
  id?: string
  describedBy?: string
  /** Goes to the card that is the group's tab stop, so Studio can focus the field. */
  focusRef?: RefCallback<HTMLButtonElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onBlur?: FocusEventHandler<HTMLElement>
  /** Smaller cards (from 88 px), for a long list of small pictures such as icons. */
  compact?: boolean
}

/**
 * The radiogroup pattern: one tab stop (the chosen card, else the first), arrows move focus between
 * cards, Enter and Space choose. A grid that fills the width the field has, as many cards across
 * as fit at 160 px or more.
 */
export function OptionGrid({
  options,
  value,
  onSelect,
  label,
  readOnly = false,
  id,
  describedBy,
  focusRef,
  onFocus,
  onBlur,
  compact = false,
}: OptionGridProps) {
  const prefix = useId()
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  // Focus moved by arrows leads; otherwise the chosen card, otherwise the first.
  const tabStop = Math.min(focusIndex ?? Math.max(selectedIndex, 0), options.length - 1)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextFocusIndex(event.key, index, options.length)
    if (next === null) return
    event.preventDefault()
    setFocusIndex(next)
    cards.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      id={id}
      aria-label={label}
      aria-describedby={describedBy}
      aria-readonly={readOnly || undefined}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 88 : 160}px, 1fr))`,
        gap: compact ? 8 : 12,
      }}
    >
      {options.map((option, index) => {
        const selected = index === selectedIndex
        const descriptionId = `${prefix}-${index}-description`
        return (
          <Card
            key={option.value}
            as="button"
            type="button"
            role="radio"
            aria-checked={selected}
            aria-describedby={option.description ? descriptionId : undefined}
            tabIndex={index === tabStop ? 0 : -1}
            ref={(element: HTMLButtonElement | null) => {
              cards.current[index] = element
              if (index === tabStop) focusRef?.(element)
            }}
            disabled={readOnly}
            data-option={option.value}
            data-selected={selected}
            padding={2}
            radius={3}
            border
            tone={selected ? 'primary' : 'default'}
            selected={selected}
            __unstable_focusRing
            onClick={() => {
              setFocusIndex(index)
              onSelect(option.value)
            }}
            onFocus={() => {
              setFocusIndex(index)
            }}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
              onKeyDown(event, index)
            }}
            style={{ textAlign: 'left', cursor: readOnly ? 'default' : 'pointer' }}
          >
            <Stack gap={compact ? 2 : 3}>
              <OptionThumbnail option={option} selected={selected} />
              <Flex align="center" gap={2}>
                <Box flex={1}>
                  <Text size={1} weight="semibold">
                    {option.title}
                  </Text>
                </Box>
                {/* Selection is not shown by colour alone. */}
                {selected ? <CheckmarkIcon aria-hidden="true" /> : null}
              </Flex>
              {option.description ? (
                <Text size={0} muted id={descriptionId} textOverflow="ellipsis">
                  {option.description}
                </Text>
              ) : null}
            </Stack>
          </Card>
        )
      })}
    </div>
  )
}
