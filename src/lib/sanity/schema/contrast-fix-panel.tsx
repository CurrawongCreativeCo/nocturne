import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { useState } from 'react'

import type { FixOutcome } from '@/lib/color/contrast-remedy'

export interface ContrastFixAction {
  id: string
  /** The button: "Use suggested colour". */
  label: string
  /** What pressing it does, in a sentence, shown beside the button. */
  detail: string
  /** What the field holds after it, so Undo is only offered while that is still true. */
  after: string
  apply: () => void
  undo: () => void
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/**
 * The fixes for one contrast warning, each a button and each undoable. Nothing changes until a
 * button is pressed. After one is, a line says what changed and offers Undo, which puts back what
 * was there; the line goes when the field changes again, so Undo never overwrites a later edit.
 * `current` is the field's value as a string, compared with each action's `after`.
 *
 * `outcome` is a fresh measurement of the field as it is now, so right after a fix the editor reads
 * whether it resolved the warning, only improved it, or (for an inherited colour that is not
 * measured) needs checking on the page. A fix is never shown as done unless the measurement says so.
 */
export function ContrastFixPanel({
  actions,
  current,
  outcome,
  readOnly,
}: {
  actions: readonly ContrastFixAction[]
  current: string
  outcome?: FixOutcome | null
  readOnly?: boolean
}) {
  const [applied, setApplied] = useState<ContrastFixAction | null>(null)
  const undoable = applied?.after === current ? applied : null
  const [undone, setUndone] = useState<string | null>(null)

  if (readOnly || (actions.length === 0 && !undoable && !undone)) return null

  return (
    <Card padding={3} radius={2} border tone="transparent">
      <Stack gap={3}>
        {actions.map((action) => (
          <Flex key={action.id} align="center" gap={3} wrap="wrap">
            <Button
              mode="ghost"
              tone="primary"
              fontSize={1}
              text={action.label}
              onClick={() => {
                action.apply()
                setApplied(action)
                setUndone(null)
              }}
            />
            <Text size={1} muted style={{ flex: 1, minWidth: 200 }}>
              {action.detail}
            </Text>
          </Flex>
        ))}
        {undoable ? (
          <Flex align="center" gap={3} wrap="wrap">
            <Text size={1}>Changed: {undoable.label.toLowerCase()}.</Text>
            <Button
              mode="bleed"
              fontSize={1}
              text="Undo"
              onClick={() => {
                undoable.undo()
                setUndone(undoable.label)
                setApplied(null)
              }}
            />
          </Flex>
        ) : null}
        {undoable && outcome ? (
          <Card
            padding={2}
            radius={2}
            tone={
              outcome.state === 'resolved'
                ? 'positive'
                : outcome.state === 'remaining'
                  ? 'caution'
                  : 'default'
            }
          >
            <Text size={1}>{outcome.text}</Text>
          </Card>
        ) : null}
        {/* Announced to screen readers; the visible lines say the same. */}
        <div role="status" aria-live="polite" style={visuallyHidden}>
          {undoable
            ? `${undoable.label}: done. ${outcome?.text ?? ''} Undo is available.`
            : undone
              ? `Undone: ${undone.toLowerCase()}.`
              : ''}
        </div>
        {undone && !undoable ? <Text size={1}>Undone: {undone.toLowerCase()}.</Text> : null}
      </Stack>
    </Card>
  )
}
