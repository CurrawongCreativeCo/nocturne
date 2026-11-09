import { Card, Spinner, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient, type ObjectInputProps } from 'sanity'
import { IntentLink } from 'sanity/router'

import { apiVersion } from '@/config/env'

import { SPACING_USAGE_QUERY } from '../api/spacing-usage-query'
import {
  countOverrides,
  describeSpacingCount,
  findSpacingOverrides,
  type SpacingUsageDocument,
} from '../utils/spacing-usage'

/** The most sections listed; the count above them is always the whole number. */
export const LISTED_LIMIT = 25

export type SpacingUsageState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; documents: SpacingUsageDocument[] }

/** The note's content for a state. Separate from the fetch so it renders in tests. */
export function SpacingUsageView({ state }: { state: SpacingUsageState }) {
  const documents = state.status === 'ready' ? state.documents : []
  const count = countOverrides(documents)
  const listed = documents
    .flatMap((document) => document.sections.map((section) => ({ document, section })))
    .slice(0, LISTED_LIMIT)
  return (
    <Card padding={3} radius={2} border tone="transparent" data-testid="spacing-usage">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          Sections with their own spacing
        </Text>
        {state.status === 'loading' && <Spinner muted />}
        {state.status === 'error' && (
          <Text size={1} muted>
            Couldn’t check which sections set their own spacing. Try reloading the Studio.
          </Text>
        )}
        {state.status === 'ready' && (
          <Text size={1}>{describeSpacingCount(count)} Sections left on Default follow it.</Text>
        )}
        {state.status === 'ready' && count > 0 && (
          <Stack as="ul" gap={2} style={{ paddingLeft: '1.25em', margin: 0 }}>
            {listed.map(({ document, section }) => (
              <Text as="li" size={1} key={`${document.id}:${section.key}:${section.path}`}>
                <IntentLink
                  intent="edit"
                  params={{ id: document.id, type: document.type, path: section.path }}
                >
                  {section.label}
                </IntentLink>{' '}
                ({section.spacing === 'compact' ? 'Compact' : 'Spacious'}) in{' '}
                {document.type === 'sharedSection'
                  ? `${document.title} (shared section)`
                  : document.title}
              </Text>
            ))}
          </Stack>
        )}
        {state.status === 'ready' && count > LISTED_LIMIT && (
          <Text size={1} muted>
            …and {count - LISTED_LIMIT} more.
          </Text>
        )}
      </Stack>
    </Card>
  )
}

/**
 * A note under Density: how many sections set their own spacing, with links to them. One narrow
 * Studio request when the document opens (`SPACING_USAGE_QUERY`: only the sections that chose Compact
 * or Spacious); the public site makes none.
 */
export function SpacingUsageNote() {
  const client = useClient({ apiVersion })
  const [state, setState] = useState<SpacingUsageState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    client
      // `raw` returns drafts beside published documents, as Content health does.
      .fetch(SPACING_USAGE_QUERY, {}, { perspective: 'raw', signal: controller.signal })
      .then((data) => {
        setState({ status: 'ready', documents: findSpacingOverrides(data) })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })
    return () => {
      controller.abort()
    }
  }, [client])

  return <SpacingUsageView state={state} />
}

/** The Brand colours root input: the count note, then the form as usual. */
export function SpacingUsageInput(props: ObjectInputProps) {
  return (
    <Stack gap={4}>
      <SpacingUsageNote />
      {props.renderDefault(props)}
    </Stack>
  )
}
