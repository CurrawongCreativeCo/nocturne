/**
 * A Contributor's Publish, when `features.publishGate` is on: asks `POST /api/publish` to publish
 * the draft (README, "Publish gate"). The route decides everything; this action only sends the
 * request and says what happened. Changes the route will not publish stay saved as drafts and show
 * up under "Waiting for review" for Currawong, so a refusal never loses work.
 */
import { PublishIcon } from '@sanity/icons/Publish'
import { Button, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'
import { useEffect, useRef, useState } from 'react'
import {
  useClient,
  useSyncState,
  type DocumentActionComponent,
  type DocumentActionProps,
  type DocumentActionsResolver,
} from 'sanity'

import { apiVersion, projectId } from '@/config/env'
import { isFeatureEnabled } from '@/config/profile'

import { currentAudience } from '../roles'
import { SentToCurrawong } from './contributor-message'
import { replacePublishForContributor } from '../utils/document-access'
import { readStudioToken, requestPublish, type GateOutcome } from '../utils/publish-gate-client'
import { siteOrigin } from '../utils/site-origin'

type State = { status: 'idle' } | { status: 'sending' } | { status: 'done'; outcome: GateOutcome }

export const PublishThroughGate: DocumentActionComponent = (props: DocumentActionProps) => {
  const { id, type, draft, release } = props
  const client = useClient({ apiVersion })
  const toast = useToast()
  const syncing = useSyncState(id, type).isSyncing
  const [state, setState] = useState<State>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      controller.current?.abort()
    },
    [],
  )

  const close = () => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }

  const send = () => {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ status: 'sending' })
    const token = readStudioToken(
      projectId,
      client.config().token,
      typeof window === 'undefined' ? undefined : window.localStorage,
    )
    requestPublish({
      origin: siteOrigin(),
      documentId: id,
      token,
      fetch: (...args) => fetch(...args),
      signal: abort.signal,
    })
      .then((outcome) => {
        if (outcome.kind === 'published') {
          toast.push({ status: 'success', title: outcome.message })
          setState({ status: 'idle' })
          return
        }
        setState({ status: 'done', outcome })
      })
      .catch(() => {
        // Only an abort reaches here: the dialog was closed, so there is nothing to show.
      })
  }

  const outcome = state.status === 'done' ? state.outcome : null
  const open = state.status !== 'idle'

  return {
    icon: PublishIcon,
    label: 'Publish',
    title: !draft
      ? 'There is nothing new to publish.'
      : 'Publishes your changes if they are all ones you can make. Anything else is sent to Currawong.',
    // Releases are agency work; the draft must have finished saving so the gate reads the latest.
    disabled: !draft || Boolean(release) || syncing,
    onHandle: send,
    dialog: open && {
      type: 'dialog',
      header: outcome ? outcome.title : 'Publishing…',
      width: 'small',
      onClose: close,
      content: outcome ? (
        <Stack gap={3}>
          <Text>{outcome.message}</Text>
          {outcome.fields.length > 0 && (
            <Stack as="ul" gap={2} style={{ paddingLeft: '1.25em', margin: 0 }}>
              {outcome.fields.map((field) => (
                <Text as="li" size={1} key={field}>
                  {field}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>
      ) : (
        <Flex align="center" gap={3} role="status">
          <Spinner muted />
          <Text>Checking your changes…</Text>
        </Flex>
      ),
      footer: outcome && (
        <Stack padding={3}>
          <Button text="Got it" tone="primary" onClick={close} />
        </Stack>
      ),
    },
  }
}
PublishThroughGate.displayName = 'PublishThroughGateAction'

/**
 * Contributors get the gate's Publish in place of Sanity's when the profile switches it on, and
 * the "Sent to Currawong" message otherwise. Other roles are untouched.
 */
export const publishGateActions: DocumentActionsResolver = (prev, { currentUser }) =>
  replacePublishForContributor(
    prev,
    currentAudience(currentUser),
    isFeatureEnabled('publishGate') ? PublishThroughGate : SentToCurrawong,
  )
