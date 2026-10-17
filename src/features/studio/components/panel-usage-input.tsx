import { Card, Spinner, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient, useFormValue, type ObjectInputProps } from 'sanity'

import { apiVersion } from '@/config/env'

import { CONTENT_HEALTH_QUERY } from '../content-health/api/query'
import { describeUsage, findPanelUsage } from '../utils/panel-usage'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; lines: string[] }

/**
 * A note above a panel's form: which buttons and links open it, so editors know what they are about
 * to change. Looks at pages, shared sections and menus once when the document opens.
 */
function PanelUsage({ id }: { id: string }) {
  const client = useClient({ apiVersion })
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    client
      // `raw` returns drafts beside published documents, as Content health does.
      .fetch(CONTENT_HEALTH_QUERY, {}, { perspective: 'raw', signal: controller.signal })
      .then((data) => {
        setState({ status: 'ready', lines: describeUsage(findPanelUsage(data, id)) })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })
    return () => {
      controller.abort()
    }
  }, [client, id])

  return (
    <Card padding={3} radius={2} border tone="transparent">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          Opened by
        </Text>
        {state.status === 'loading' && <Spinner muted />}
        {state.status === 'error' && (
          <Text size={1} muted>
            Couldn’t check which buttons open this panel. Try reloading the Studio.
          </Text>
        )}
        {state.status === 'ready' && state.lines.length === 0 && (
          <Text size={1} muted>
            No button or link opens this panel yet. Add one with “Goes to: Open a panel”.
          </Text>
        )}
        {state.status === 'ready' && state.lines.length > 0 && (
          <Stack as="ul" gap={2} style={{ paddingLeft: '1.25em', margin: 0 }}>
            {state.lines.map((line) => (
              <Text as="li" size={1} key={line}>
                {line}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

/** The panel form's root input: the usage note, then the form as usual. */
export function PanelUsageInput(props: ObjectInputProps) {
  const documentId = useFormValue(['_id'])
  const id = typeof documentId === 'string' ? documentId.replace(/^drafts\./, '') : null
  return (
    <Stack gap={4}>
      {id && <PanelUsage id={id} />}
      {props.renderDefault(props)}
    </Stack>
  )
}
