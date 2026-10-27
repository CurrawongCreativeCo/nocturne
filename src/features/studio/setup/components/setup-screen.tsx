import { Badge, Box, Button, Card, Container, Flex, Heading, Stack, Text } from '@sanity/ui'
import { Fragment, useEffect, useId, useRef, type ReactNode } from 'react'

import type { FeatureDetail, FeatureRow, SetupGroupId, SetupView } from '../utils/setup-view'
import { SETUP_TITLE, STATUS_LABEL } from '../utils/setup-wording'

const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0 } as const

const TONE: Record<SetupGroupId, 'caution' | 'default' | 'positive'> = {
  attention: 'caution',
  'cant-check': 'default',
  ready: 'positive',
  off: 'default',
}

/** Words between backticks are commands or names: shown as code, the rest as text. */
export function withCode(text: string): ReactNode {
  let offset = 0
  return text.split('`').map((part, index) => {
    const key = offset
    offset += part.length + 1
    return index % 2 === 1 ? <code key={key}>{part}</code> : <Fragment key={key}>{part}</Fragment>
  })
}

/** Moves focus to the heading when the view changes, so keyboard and screen reader users land on it. */
function useFocusOnChange(key: string, focusFirst = false) {
  const ref = useRef<HTMLHeadingElement>(null)
  const first = useRef(!focusFirst)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current?.focus()
  }, [key])
  return ref
}

function StatusBadge({ group }: { group: SetupGroupId }) {
  return (
    <Badge tone={TONE[group]} fontSize={0}>
      {STATUS_LABEL[group]}
    </Badge>
  )
}

function Row({ row, onOpen }: { row: FeatureRow; onOpen: (id: string) => void }) {
  return (
    <Card as="li" padding={3} radius={2} border tone={row.group ? TONE[row.group] : 'default'}>
      <Flex align="center" justify="space-between" gap={3} wrap="wrap">
        <Stack gap={2} flex={1} style={{ minWidth: '12rem' }}>
          <Flex align="center" gap={2} wrap="wrap">
            <Text size={1} weight="semibold">
              {row.title}
            </Text>
            {row.isNew && (
              <Badge tone="primary" fontSize={0}>
                New
              </Badge>
            )}
          </Flex>
          <Text size={1} muted>
            {withCode(row.message)}
          </Text>
        </Stack>
        <Button
          text="Details"
          mode="ghost"
          fontSize={1}
          aria-label={`Details: ${row.title}`}
          onClick={() => {
            onOpen(row.id)
          }}
        />
      </Flex>
    </Card>
  )
}

/** The list: groups by state with a status, or one plain list of explanations without. */
export function SetupList({
  view,
  onOpen,
  returned = false,
  titleAs = 'h1',
}: {
  view: SetupView
  onOpen: (id: string) => void
  /** Back from a feature's details: focus the heading. */
  returned?: boolean
  /** The title's level: a pane has its own page, the brand preview nests it. */
  titleAs?: 'h1' | 'h3'
}) {
  const id = useId()
  const heading = useFocusOnChange('list', returned)
  const sectionLevel = titleAs === 'h1' ? 'h2' : 'h4'
  return (
    <Box padding={[3, 4, 5]} style={{ height: '100%', overflow: 'auto' }}>
      <Container width={2}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Heading as={titleAs} size={3} ref={heading} tabIndex={-1}>
              {SETUP_TITLE}
            </Heading>
            {view.header && (
              <Text size={1} muted>
                {view.header}
              </Text>
            )}
            {view.note && (
              <Card tone="primary" padding={3} radius={2} border role="note">
                <Text size={1}>{withCode(view.note)}</Text>
              </Card>
            )}
          </Stack>

          {view.groups.map((group) => (
            <Stack as="section" key={group.id} gap={3} aria-labelledby={`${id}-${group.id}`}>
              <Heading as={sectionLevel} size={1} id={`${id}-${group.id}`}>
                {group.title} ({group.rows.length})
              </Heading>
              <Stack as="ul" gap={2} style={LIST_STYLE}>
                {group.rows.map((row) => (
                  <Row key={row.id} row={row} onOpen={onOpen} />
                ))}
              </Stack>
            </Stack>
          ))}

          {view.rows.length > 0 && (
            <Stack as="section" gap={3} aria-labelledby={`${id}-all`}>
              <Heading as={sectionLevel} size={1} id={`${id}-all`}>
                Features ({view.rows.length})
              </Heading>
              <Stack as="ul" gap={2} style={LIST_STYLE}>
                {view.rows.map((row) => (
                  <Row key={row.id} row={row} onOpen={onOpen} />
                ))}
              </Stack>
            </Stack>
          )}

          {view.newIn && (
            <Text size={1} muted>
              {view.newIn.label}: {view.newIn.rows.map((row) => row.title).join(', ')}
            </Text>
          )}

          <Text size={1} muted>
            {view.footer}
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Stack as="section" gap={3} aria-labelledby={id}>
      <Heading as="h2" size={1} id={id}>
        {title}
      </Heading>
      {children}
    </Stack>
  )
}

/** One feature: what it does, why, what happens without it, what it needs, how to set it up, and the technical details. */
export function SetupDetail({
  detail,
  footer,
  onBack,
}: {
  detail: FeatureDetail
  footer: string
  onBack: () => void
}) {
  const heading = useFocusOnChange(detail.id)
  return (
    <Box padding={[3, 4, 5]} style={{ height: '100%', overflow: 'auto' }}>
      <Container width={2}>
        <Stack gap={5}>
          <Flex>
            <Button text="All features" mode="bleed" fontSize={1} onClick={onBack} />
          </Flex>
          <Stack gap={3}>
            <Heading as="h1" size={3} ref={heading} tabIndex={-1}>
              {detail.title}
            </Heading>
            {detail.group && (
              <Flex align="center" gap={3} wrap="wrap">
                <StatusBadge group={detail.group} />
                {detail.message && (
                  <Text size={1} muted>
                    {withCode(detail.message)}
                  </Text>
                )}
              </Flex>
            )}
            {detail.howToCheck && !detail.group && (
              <Text size={1} muted>
                {withCode(detail.howToCheck)}
              </Text>
            )}
          </Stack>

          <Part title="What it does">
            <Text size={1}>{detail.whatItDoes}</Text>
          </Part>
          <Part title="Why you’d use it">
            <Text size={1}>{detail.why}</Text>
          </Part>
          <Part title="What happens without it">
            <Text size={1}>{detail.withoutIt}</Text>
          </Part>

          {detail.needs.length > 0 && (
            <Part title="What it needs">
              <Stack as="ul" gap={2} style={LIST_STYLE}>
                {detail.needs.map((need) => (
                  <Card key={need.name} as="li" padding={3} radius={2} border>
                    <Stack gap={2}>
                      <Flex align="center" gap={2} wrap="wrap">
                        <code>{need.name}</code>
                        {need.presence && (
                          <Badge
                            tone={
                              need.presence === 'Set'
                                ? 'positive'
                                : need.presence === "Can't be checked from here"
                                  ? 'default'
                                  : 'caution'
                            }
                            fontSize={0}
                          >
                            {need.presence}
                          </Badge>
                        )}
                      </Flex>
                      {need.purpose && <Text size={1}>{need.purpose}</Text>}
                      <Text size={1} muted>
                        {need.requirement}. Set in {need.where}
                        {need.targets ? ` (${need.targets})` : ''}. {need.timing}.
                      </Text>
                      {need.source && (
                        <Text size={1} muted>
                          Where to find it: {need.source}
                        </Text>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Part>
          )}

          <Part title="How to set it up">
            <Stack as="ol" gap={3} style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
              {detail.steps.map((step) => (
                <li key={step}>
                  <Text size={1}>{step}</Text>
                </li>
              ))}
            </Stack>
            {detail.howToCheck && detail.group && (
              <Text size={1} muted>
                {withCode(detail.howToCheck)}
              </Text>
            )}
          </Part>

          <details>
            <summary style={{ cursor: 'pointer' }}>
              <Text as="span" size={1} weight="medium">
                Technical details
              </Text>
            </summary>
            <Stack gap={3} paddingTop={3}>
              {detail.technical.map((setting) => (
                <Stack key={setting.name} gap={2}>
                  <code>{setting.name}</code>
                  <Stack as="ul" gap={1} style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
                    {setting.details.map((line) => (
                      <li key={line}>
                        <Text size={1} muted>
                          {line}
                        </Text>
                      </li>
                    ))}
                  </Stack>
                </Stack>
              ))}
              <Text size={1} muted>
                More in the README: {detail.docs}
              </Text>
            </Stack>
          </details>

          <Text size={1} muted>
            {footer}
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}
