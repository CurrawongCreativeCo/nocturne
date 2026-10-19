import { CloseIcon } from '@sanity/icons/Close'
import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useId, useRef, useState, type FocusEventHandler, type RefCallback } from 'react'

import { OptionGrid, OptionThumbnail, type GridOption } from './option-grid'

interface PickerViewProps {
  options: readonly GridOption[]
  /** The chosen option's value; null for none, or for a preset bar whose fields match no preset. */
  value: string | null
  onSelect: (value: string) => void
  label: string
  readOnly?: boolean
  id?: string
  describedBy?: string
  focusRef?: RefCallback<HTMLButtonElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onBlur?: FocusEventHandler<HTMLElement>
  /**
   * What the collapsed summary says when `value` is null. Without it, nothing is chosen yet and the
   * options are shown straight away. With it ("Custom"), the summary shows and "Change" opens them.
   */
  unmatched?: { title: string; description: string }
}

/**
 * The picker as editors see it. Collapsed (the usual state once something is chosen) it is one row:
 * the chosen option's picture and title and a "Change" button, so long forms stay short. "Change"
 * opens the grid; choosing an option closes it again and puts focus back on the button.
 *
 * Open, the grid has a header with a Close button (an X and the word, a real button with a border,
 * so it reads as a control) in the same place on every picker, and Escape closes it too. Closing only
 * folds the grid away: nothing is changed or lost, and focus goes back to "Change". It is Close, not
 * Back, because the picker opens in place: there is no previous screen to return to.
 */
export function PickerView({ unmatched, ...grid }: PickerViewProps) {
  const { options, value, onSelect, label, readOnly } = grid
  const chosen = options.find((option) => option.value === value)
  const hasSummary = Boolean(chosen) || Boolean(unmatched)
  const [open, setOpen] = useState(false)
  const gridId = useId()
  const changeButton = useRef<HTMLButtonElement>(null)
  const gridWrapper = useRef<HTMLDivElement>(null)
  const justClosed = useRef(false)

  // Opening moves focus into the grid (onto the chosen card). After choosing, focus returns to
  // "Change" as soon as it exists: the new value can arrive a moment after the click.
  useEffect(() => {
    if (open) {
      gridWrapper.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
    } else if (justClosed.current && changeButton.current) {
      changeButton.current.focus()
      justClosed.current = false
    }
  }, [open, hasSummary, chosen?.value])

  const close = () => {
    justClosed.current = true
    setOpen(false)
  }

  // Escape folds an open grid away, from anywhere inside it. Inside a dialog, Escape would otherwise
  // close the whole dialog, so it stops there.
  const canClose = hasSummary && open
  useEffect(() => {
    const wrapper = gridWrapper.current
    if (!canClose || !wrapper) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      justClosed.current = true
      setOpen(false)
    }
    wrapper.addEventListener('keydown', onKeyDown)
    return () => {
      wrapper.removeEventListener('keydown', onKeyDown)
    }
  }, [canClose])

  if (!hasSummary || open) {
    return (
      <Stack gap={3}>
        {hasSummary ? (
          <Flex align="center" justify="space-between" gap={2}>
            <Text size={1} weight="semibold">
              Choose {label.toLowerCase()}
            </Text>
            <Button
              icon={CloseIcon}
              text="Close"
              mode="ghost"
              fontSize={1}
              padding={2}
              aria-label={`Close ${label} options`}
              aria-controls={gridId}
              aria-expanded
              onClick={close}
            />
          </Flex>
        ) : null}
        <div ref={gridWrapper} id={gridId}>
          <OptionGrid
            {...grid}
            onSelect={(next) => {
              justClosed.current = true
              setOpen(false)
              onSelect(next)
            }}
          />
        </div>
      </Stack>
    )
  }

  return (
    <Card padding={2} radius={3} border data-picker-summary="">
      <Flex align="center" gap={3}>
        <div style={{ width: 96, flexShrink: 0 }}>
          {chosen ? <OptionThumbnail option={chosen} selected /> : null}
        </div>
        <Stack flex={1} gap={2}>
          <Text size={1} weight="semibold" data-picker-current="">
            {chosen?.title ?? unmatched?.title}
          </Text>
          <Text size={0} muted>
            {chosen?.description ?? unmatched?.description}
          </Text>
        </Stack>
        <Button
          ref={changeButton}
          text="Change"
          mode="ghost"
          fontSize={1}
          disabled={readOnly}
          aria-expanded={false}
          aria-controls={gridId}
          aria-label={`Change ${label}`}
          onClick={() => {
            setOpen(true)
          }}
        />
      </Flex>
    </Card>
  )
}
