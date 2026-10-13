import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@sanity/ui'
import { useCallback, useEffect, useState } from 'react'
import { useClient } from 'sanity'
import { IntentLink } from 'sanity/router'

import { apiVersion } from '@/config/env'

import { CONTENT_HEALTH_QUERY } from '../api/query'
import { buildReport, type HealthGroup } from '../utils/build-report'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; groups: HealthGroup[] }

/** Read-only: one query, then every check runs in the browser. */
export function ContentHealthTool() {
  const client = useClient({ apiVersion })
  const [state, setState] = useState<State>({ status: 'loading' })
  const [run, setRun] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    client
      // `raw` returns drafts beside published documents; the default perspective hides drafts.
      .fetch(CONTENT_HEALTH_QUERY, {}, { perspective: 'raw', signal: controller.signal })
      .then((data) => {
        setState({ status: 'ready', groups: buildReport(data) })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      })
    return () => {
      controller.abort()
    }
  }, [client, run])

  const refresh = useCallback(() => {
    setState({ status: 'loading' })
    setRun((n) => n + 1)
  }, [])

  return (
    <Box padding={4} style={{ height: '100%', overflow: 'auto' }}>
      <Container width={2}>
        <Stack gap={5}>
          <Flex align="center" justify="space-between" gap={3}>
            <Heading as="h1" size={2}>
              Content health
            </Heading>
            <Button
              text="Refresh"
              mode="ghost"
              onClick={refresh}
              disabled={state.status === 'loading'}
            />
          </Flex>
          {state.status === 'loading' && (
            <Flex align="center" gap={3} role="status">
              <Spinner muted />
              <Text muted size={1}>
                Checking content…
              </Text>
            </Flex>
          )}
          {state.status === 'error' && (
            <Card tone="critical" padding={4} radius={2} role="alert">
              <Text size={1}>Could not load content: {state.message}</Text>
            </Card>
          )}
          {state.status === 'ready' &&
            state.groups.map((group) => <Group key={group.id} group={group} />)}
        </Stack>
      </Container>
    </Box>
  )
}

function Group({ group }: { group: HealthGroup }) {
  const { items } = group
  return (
    <Stack gap={3} as="section" aria-labelledby={`health-${group.id}`}>
      <Flex align="center" gap={2}>
        <Heading as="h2" size={1} id={`health-${group.id}`}>
          {group.title}
        </Heading>
        <Badge tone={items.length ? 'caution' : 'positive'}>{items.length}</Badge>
      </Flex>
      <Text muted size={1}>
        {group.description}
      </Text>
      {items.length === 0 ? (
        <Card tone="positive" padding={3} radius={2} border>
          <Text size={1}>Nothing to fix.</Text>
        </Card>
      ) : (
        <Stack as="ul" gap={2} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item) => (
            <Card key={`${item.id}-${item.detail ?? ''}`} as="li" padding={3} radius={2} border>
              <Stack gap={2}>
                <Text size={1} weight="medium">
                  <IntentLink intent="edit" params={{ id: item.id, type: item.type }}>
                    {item.title}
                  </IntentLink>
                </Text>
                {item.detail && (
                  <Text muted size={1}>
                    {item.detail}
                  </Text>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
