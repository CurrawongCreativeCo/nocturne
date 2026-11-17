import { Button, Flex, Stack, Text } from '@sanity/ui'
import { unset, type ObjectInputProps } from 'sanity'

import {
  designGroupChanges,
  designResetKeys,
  summariseDesign,
  type DesignSummaryConfig,
} from '@/lib/sanity/design-summary'

/**
 * The top of any section, card or item design object that sets `options.designSummary` (task 275;
 * README, "Design capability contract"): what it changes and at which level, then the ways back.
 * "Reset all" removes the object's whole saved design, so it follows what is above again; a group's
 * reset clears only that group's saved choices. Both are ordinary patches on this object (undoable,
 * never touching a sibling). The fields below are the normal form.
 *
 * The Link list link's Appearance is one of these, with its own words (lib/sanity/link-design-summary.ts).
 */
export function DesignSummaryInput({
  summary: config,
  ...props
}: ObjectInputProps & { summary: DesignSummaryConfig }) {
  const { value, onChange, readOnly } = props
  const stored = value as Record<string, unknown> | undefined
  const summary = summariseDesign(config, stored)
  const hasAnything = stored !== undefined && Object.keys(stored).some((key) => key !== '_type')

  return (
    <Stack gap={4}>
      <Stack gap={3} data-testid={config.testId ?? 'design-summary'}>
        <Text size={1} weight="semibold" role="status">
          {summary.text}
        </Text>
        <Text size={1} muted>
          {summary.state === 'custom'
            ? `${summary.scopeLabel}. ${config.customisedNote}`
            : summary.kept > 0
              ? `${String(summary.kept)} saved ${summary.kept === 1 ? 'choice is' : 'choices are'} kept but not applied. ${config.customiseAction} to use ${summary.kept === 1 ? 'it' : 'them'}.`
              : config.nothingSaved}
        </Text>
        {summary.labels.length > 0 ? (
          <Text size={1} muted>
            Changes: {summary.labels.join(', ')}.
          </Text>
        ) : null}
        {hasAnything ? (
          <Flex gap={2} wrap="wrap">
            <Button
              text={config.resetAllText}
              mode="ghost"
              tone="caution"
              fontSize={1}
              padding={2}
              disabled={readOnly}
              onClick={() => {
                onChange(unset())
              }}
            />
            {config.groups.map((group) => {
              const keys = designResetKeys(config, stored, group.id)
              if (keys.length === 0) return null
              const changes = designGroupChanges(config, stored, group.id)
              return (
                <Button
                  key={group.id}
                  text={`Reset ${group.title.toLowerCase()}${changes > 0 ? ` (${String(changes)})` : ''}`}
                  mode="ghost"
                  fontSize={1}
                  padding={2}
                  disabled={readOnly}
                  data-reset-group={group.id}
                  onClick={() => {
                    onChange(keys.map((key) => unset([key])))
                  }}
                />
              )
            })}
          </Flex>
        ) : null}
      </Stack>
      {props.renderDefault(props)}
    </Stack>
  )
}
