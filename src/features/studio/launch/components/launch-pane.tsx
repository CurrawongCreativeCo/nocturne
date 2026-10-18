import { Box, Button, Card, Flex, Spinner, Text } from '@sanity/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient, useCurrentUser } from 'sanity'
import { IntentLink } from 'sanity/router'

import { apiVersion, studioUrl } from '@/config/env'
import { getLaunchState } from '@/config/launch'

import { LaunchScreen, type RenderEditLink } from './launch-screen'
import { currentAudience } from '../../roles'
import { toolHref } from '../../start-here/utils/quick-actions'
import { siteOrigin } from '../../utils/site-origin'
import { LAUNCH_LISTEN_FILTER, LAUNCH_QUERY } from '../api/launch-query'
import type { LaunchData } from '../utils/launch-checklist'
import { buildLaunchView } from '../utils/launch-view'
import { seesChecklist } from '../utils/launch-wording'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LaunchData }

/**
 * The desk's Website settings → Launch & visibility. Read-only: the launch state is in code
 * (`getLaunchState`, bundled with the Studio; it holds no secret) and the checklist is worked out
 * from published content. It re-reads when a page, the navigation, the site identity or Business
 * info changes, so ticking things off updates it live.
 */
export function LaunchPane() {
  const client = useClient({ apiVersion })
  const user = useCurrentUser()
  const audience = currentAudience(user)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const load = () => {
      client
        .fetch<LaunchData>(LAUNCH_QUERY, {}, { perspective: 'raw', signal })
        .then((data) => {
          if (!signal.aborted) setState({ status: 'ready', data })
        })
        .catch((error: unknown) => {
          if (signal.aborted) return
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        })
    }
    load()
    // Any change to what the checklist reads fetches again; bursts (a publish is two writes) are merged.
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = client
      .listen(`*[${LAUNCH_LISTEN_FILTER}]`, {}, { includeResult: false, visibility: 'query' })
      .subscribe(() => {
        clearTimeout(timer)
        timer = setTimeout(load, 400)
      })
    return () => {
      controller.abort()
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [client])

  const launch = useMemo(() => getLaunchState(undefined, {}), [])
  const view = useMemo(
    () =>
      state.status === 'ready'
        ? buildLaunchView({ state: launch, audience, data: state.data, siteUrl: siteOrigin() })
        : null,
    [state, launch, audience],
  )

  const renderEditLink: RenderEditLink = useCallback(
    (target, label) =>
      target.intent === 'create' ? (
        <Button
          as={IntentLink}
          intent="create"
          params={{ type: target.type }}
          text={label}
          mode="ghost"
          fontSize={1}
        />
      ) : (
        <Button
          as={IntentLink}
          intent="edit"
          params={{ type: target.type, id: target.id ?? '' }}
          text={label}
          mode="ghost"
          fontSize={1}
        />
      ),
    [],
  )

  if (state.status === 'error') {
    return (
      <Box padding={4}>
        <Card tone="critical" padding={4} radius={2} role="alert">
          <Text size={1}>Could not load the launch details: {state.message}</Text>
        </Card>
      </Box>
    )
  }
  if (!view) {
    return (
      <Flex align="center" gap={3} padding={4} role="status">
        <Spinner muted />
        <Text muted size={1}>
          Loading…
        </Text>
      </Flex>
    )
  }
  return (
    <LaunchScreen
      view={view}
      agency={seesChecklist(audience)}
      previewHref={toolHref(
        { kind: 'tool', tool: 'presentation', search: 'preview=%2F' },
        studioUrl,
      )}
      renderEditLink={renderEditLink}
    />
  )
}
