import { Button, Flex, Stack, Text } from '@sanity/ui'
import { unset, type ObjectInputProps } from 'sanity'

import {
  LINK_DESIGN_GROUPS,
  LINK_DESIGN_GROUP_TITLES,
  LINK_DESIGN_SCOPES,
  groupChanges,
  resetKeys,
  summariseLinkDesign,
} from '@/lib/sanity/link-design-summary'

/**
 * The top of a link's Appearance (`options.linkDesignSummary`): what the link changes and at which
 * level, then the ways back. "Reset this link" removes the link's whole Appearance, so it follows the
 * Link list design again; a group's reset clears only that group's saved choices. Both are ordinary
 * patches on this link's own `design` object (undoable, never touching a sibling link or the list).
 * The fields below are the normal form.
 */
export function LinkDesignSummaryInput(props: ObjectInputProps) {
  const { value, onChange, readOnly } = props
  const stored = value as Record<string, unknown> | undefined
  const summary = summariseLinkDesign(stored)
  const hasAnything = stored !== undefined && Object.keys(stored).some((key) => key !== '_type')

  return (
    <Stack gap={4}>
      <Stack gap={3} data-testid="link-design-summary">
        <Text size={1} weight="semibold" role="status">
          {summary.text}
        </Text>
        <Text size={1} muted>
          {summary.state === 'custom'
            ? `${LINK_DESIGN_SCOPES.link}. Everything not listed follows the Link list design.`
            : summary.kept > 0
              ? `${String(summary.kept)} saved ${summary.kept === 1 ? 'choice is' : 'choices are'} kept but not applied. Choose Customise this card to use ${summary.kept === 1 ? 'it' : 'them'}.`
              : 'Choose Customise this card to change only this link.'}
        </Text>
        {summary.labels.length > 0 ? (
          <Text size={1} muted>
            Changes: {summary.labels.join(', ')}.
          </Text>
        ) : null}
        {hasAnything ? (
          <Flex gap={2} wrap="wrap">
            <Button
              text="Reset this link"
              mode="ghost"
              tone="caution"
              fontSize={1}
              padding={2}
              disabled={readOnly}
              onClick={() => {
                onChange(unset())
              }}
            />
            {LINK_DESIGN_GROUPS.map((group) => {
              const keys = resetKeys(stored, group)
              if (keys.length === 0) return null
              const changes = groupChanges(stored, group)
              return (
                <Button
                  key={group}
                  text={`Reset ${LINK_DESIGN_GROUP_TITLES[group].toLowerCase()}${changes > 0 ? ` (${String(changes)})` : ''}`}
                  mode="ghost"
                  fontSize={1}
                  padding={2}
                  disabled={readOnly}
                  data-reset-group={group}
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
