/**
 * Delete for pages: replaces Sanity's one-line confirmation with one that lists the menus and
 * pages linking to the page, so editors see what will be left with a broken link.
 */
import { TrashIcon } from '@sanity/icons/Trash'
import { Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import {
  useClient,
  useDocumentOperation,
  type DocumentActionComponent,
  type DocumentActionProps,
  type DocumentActionsResolver,
} from 'sanity'

import { apiVersion } from '@/config/env'

import { CONTENT_HEALTH_QUERY } from '../content-health/api/query'
import { findIncomingLinks, type IncomingLinks } from '../utils/incoming-links'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; links: IncomingLinks }

/** A lookup outcome tagged with the open count it belongs to, so a stale one reads as loading. */
interface Lookup {
  opened: number
  result: { error: true } | { links: IncomingLinks }
}

export const ConfirmDeletePage: DocumentActionComponent = ({
  id,
  type,
  draft,
  published,
  release,
}: DocumentActionProps) => {
  const client = useClient({ apiVersion })
  const { delete: del } = useDocumentOperation(id, type, release)
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(0)
  const [lookup, setLookup] = useState<Lookup | null>(null)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    client
      // `raw` returns drafts beside published documents, as Content health does.
      .fetch(CONTENT_HEALTH_QUERY, {}, { perspective: 'raw', signal: controller.signal })
      .then((data) => {
        setLookup({ opened, result: { links: findIncomingLinks(data, id) } })
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ opened, result: { error: true } })
      })
    return () => {
      controller.abort()
    }
  }, [open, opened, client, id])

  const state: State =
    lookup?.opened !== opened
      ? { status: 'loading' }
      : 'error' in lookup.result
        ? { status: 'error' }
        : { status: 'ready', links: lookup.result.links }
  const title = (draft ?? published)?.title
  return {
    label: 'Delete',
    icon: TrashIcon,
    tone: 'critical',
    disabled: Boolean(del.disabled) || (!draft && !published),
    title: del.disabled ? 'This page cannot be deleted' : undefined,
    shortcut: 'Ctrl+Alt+D',
    onHandle: () => {
      setOpened((n) => n + 1)
      setOpen(true)
    },
    dialog: open && {
      type: 'dialog',
      header: 'Delete page',
      width: 'small',
      onClose: () => {
        setOpen(false)
      },
      content: (
        <Stack gap={4}>
          <Text>
            Delete {typeof title === 'string' && title ? `“${title}”` : 'this page'}? This removes
            the draft and the published page, and the address stops working.
          </Text>
          <IncomingLinksList state={state} />
        </Stack>
      ),
      footer: (
        <Flex gap={2} justify="flex-end" padding={3}>
          <Button
            text="Cancel"
            mode="bleed"
            onClick={() => {
              setOpen(false)
            }}
          />
          <Button
            text="Delete"
            tone="critical"
            onClick={() => {
              setOpen(false)
              del.execute()
            }}
          />
        </Flex>
      ),
    },
  }
}
ConfirmDeletePage.action = 'delete'
ConfirmDeletePage.displayName = 'ConfirmDeletePageAction'

function IncomingLinksList({ state }: { state: State }) {
  if (state.status === 'loading') {
    return (
      <Flex align="center" gap={2}>
        <Spinner muted />
        <Text size={1} muted>
          Checking what links to this page…
        </Text>
      </Flex>
    )
  }
  if (state.status === 'error') {
    return <Text size={1}>Links to this page could not be checked.</Text>
  }
  const { menus, documents } = state.links
  if (menus.length === 0 && documents.length === 0) {
    return (
      <Text size={1} muted>
        No menus or pages link to this page.
      </Text>
    )
  }
  return (
    <Card padding={3} radius={2} tone="caution" border>
      <Stack gap={3}>
        <Text size={1}>These link to this page and will be left with a broken link:</Text>
        <Stack gap={2} as="ul" style={{ margin: 0, paddingLeft: '1.25em' }}>
          {menus.map((menu) => (
            <Text as="li" size={1} key={menu}>
              {menu} (Navigation)
            </Text>
          ))}
          {documents.map(({ id, title, kind }) => (
            <Text as="li" size={1} key={id}>
              {title} ({kind === 'page' ? 'page' : 'shared section'})
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}

/** Swaps Sanity's Delete for the confirmation above, on pages only. */
export const confirmDeletePageActions: DocumentActionsResolver = (prev, { schemaType }) =>
  schemaType === 'page'
    ? prev.map((action) => (action.action === 'delete' ? ConfirmDeletePage : action))
    : prev
