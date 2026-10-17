/**
 * Publish confirmation for pages and posts. Wraps Sanity's own Publish action (so validation,
 * labels and progress stay Sanity's) behind a dialog naming the address that goes live, shown for a
 * first publish and for an address change only (needsPublishConfirmation). When the published slug
 * and the draft's differ, the dialog offers to leave a redirect from the old address.
 */
import { Box, Button, Card, Checkbox, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useClient,
  type DocumentActionComponent,
  type DocumentActionDescription,
  type DocumentActionProps,
  type DocumentActionsResolver,
} from 'sanity'

import { apiVersion } from '@/config/env'

import { resolveVersions, type RedirectRule } from '../content-health/utils/detect'
import {
  buildRedirectDocument,
  CONFIRMED_PUBLISH_TYPES,
  detectAddressChange,
  documentPath,
  joinUrl,
  needsPublishConfirmation,
  planRedirect,
  readSlug,
  type AddressChange,
  type RedirectPlan,
} from '../utils/publish-redirect'
import { siteOrigin } from '../utils/site-origin'

const REDIRECTS_QUERY = '*[_type == "redirect"]{_id, source, destination}'

type Plan = { status: 'loading' } | { status: 'error' } | { status: 'ready'; plan: RedirectPlan }

/** A plan lookup result and the address change it was made for, so a stale result reads as loading. */
interface Lookup {
  key: string
  result: { error: true } | { plan: RedirectPlan }
}

export function withConfirmPublish(Publish: DocumentActionComponent): DocumentActionComponent {
  const ConfirmPublish: DocumentActionComponent = (props: DocumentActionProps) => {
    const { draft, published, type, release } = props
    const client = useClient({ apiVersion })
    const toast = useToast()
    const [open, setOpen] = useState(false)
    const [createRedirect, setCreateRedirect] = useState(true)
    const [lookup, setLookup] = useState<Lookup | null>(null)
    // The change being published, held until the draft has become the published version.
    const pending = useRef<AddressChange | null>(null)
    const original = Publish(props)

    const path = documentPath(type, readSlug(draft))
    const change = detectAddressChange(type, readSlug(published), readSlug(draft))

    const fetchPlan = useCallback(
      async (target: AddressChange, signal?: AbortSignal): Promise<RedirectPlan> => {
        const docs = await client.fetch<(RedirectRule & { _id: string })[]>(
          REDIRECTS_QUERY,
          {},
          // `raw` includes redirect drafts, which count as duplicates too.
          { perspective: 'raw', signal },
        )
        const rules = resolveVersions(docs).map(({ id, doc }) => ({ ...doc, id }))
        return planRedirect(rules, target)
      },
      [client],
    )

    const changeFrom = change?.from
    const changeTo = change?.to
    const key = `${changeFrom}>${changeTo}`
    useEffect(() => {
      if (!open || !changeFrom || !changeTo) return
      const controller = new AbortController()
      fetchPlan({ from: changeFrom, to: changeTo }, controller.signal)
        .then((plan) => {
          setLookup({ key, result: { plan } })
        })
        .catch(() => {
          if (!controller.signal.aborted) setLookup({ key, result: { error: true } })
        })
      return () => {
        controller.abort()
      }
    }, [open, changeFrom, changeTo, key, fetchPlan])

    // Once the draft is gone the publish has gone through; only then is it safe to leave the redirect.
    useEffect(() => {
      const target = pending.current
      if (!target || draft || !published) return
      pending.current = null
      fetchPlan(target)
        .then(async (result) => {
          if (result.kind !== 'create') throw new Error('A redirect from the old address exists')
          // No drafts. prefix: created already published, so it works straight away.
          await client.create(buildRedirectDocument(target))
          toast.push({
            status: 'success',
            title: `Redirect created from ${target.from} to ${target.to}`,
          })
        })
        .catch(() => {
          toast.push({
            status: 'warning',
            title: 'Published, but no redirect was created',
            description: `Add one from ${target.from} to ${target.to} under Redirects.`,
          })
        })
    }, [draft, published, client, toast, fetchPlan])

    if (!original || release || !CONFIRMED_PUBLISH_TYPES.has(type)) return original

    const plan: Plan =
      lookup?.key !== key
        ? { status: 'loading' }
        : 'error' in lookup.result
          ? { status: 'error' }
          : { status: 'ready', plan: lookup.result.plan }
    const canRedirect = plan.status === 'ready' && plan.plan.kind === 'create'
    const url = path ? joinUrl(siteOrigin(), path) : null

    const confirm = () => {
      setOpen(false)
      if (change && createRedirect && canRedirect) pending.current = change
      original.onHandle?.()
    }

    const description: DocumentActionDescription = {
      ...original,
      label: original.label,
      // Sanity's own state (validation errors, nothing to publish) still decides whether it can run.
      onHandle: () => {
        // An edit to a live page at the same address has nothing to confirm.
        if (!needsPublishConfirmation(Boolean(published), change)) {
          original.onHandle?.()
          return
        }
        setCreateRedirect(true)
        setOpen(true)
      },
      dialog: open && {
        type: 'dialog',
        header: 'Publish',
        width: 'small',
        onClose: () => {
          setOpen(false)
        },
        content: (
          <Stack gap={4}>
            <Text>{url ? `Publish changes to ${url}?` : 'Publish changes to this document?'}</Text>
            {change ? (
              <Card padding={3} radius={2} tone="caution" border>
                <Stack gap={3}>
                  <Text size={1}>
                    The address will change from {change.from} to {change.to}.{' '}
                    {canRedirect || plan.status === 'loading'
                      ? 'Create a redirect from the old address?'
                      : null}
                  </Text>
                  <RedirectChoice
                    plan={plan}
                    checked={createRedirect}
                    onChange={setCreateRedirect}
                    change={change}
                  />
                </Stack>
              </Card>
            ) : null}
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
              text="Publish"
              tone="positive"
              onClick={confirm}
              disabled={Boolean(change) && plan.status === 'loading'}
            />
          </Flex>
        ),
      },
    }
    return description
  }
  ConfirmPublish.action = Publish.action
  ConfirmPublish.displayName = 'ConfirmPublishAction'
  return ConfirmPublish
}

function RedirectChoice({
  plan,
  checked,
  onChange,
  change,
}: {
  plan: Plan
  checked: boolean
  onChange: (value: boolean) => void
  change: AddressChange
}) {
  if (plan.status === 'loading') {
    return (
      <Flex align="center" gap={2}>
        <Spinner muted />
        <Text size={1} muted>
          Checking existing redirects…
        </Text>
      </Flex>
    )
  }
  if (plan.status === 'error') {
    return (
      <Text size={1}>
        Existing redirects could not be checked, so none will be created. Add one under Redirects
        after publishing.
      </Text>
    )
  }
  if (plan.plan.kind === 'duplicate') {
    return (
      <Text size={1}>
        A redirect from {change.from} to {plan.plan.destination} already exists, so no new one will
        be created. Check it still suits the new address.
      </Text>
    )
  }
  if (plan.plan.kind === 'loop') {
    return (
      <Text size={1}>
        A redirect from {change.from} would loop ({plan.plan.path.join(' → ')}), so none will be
        created.
      </Text>
    )
  }
  return (
    <Stack gap={3}>
      <Flex align="center" gap={2} as="label">
        <Checkbox
          checked={checked}
          onChange={(event) => {
            onChange(event.currentTarget.checked)
          }}
        />
        <Box>
          <Text size={1}>
            Redirect {change.from} to {change.to} (permanent)
          </Text>
        </Box>
      </Flex>
      {plan.plan.chained.length > 0 ? (
        <Text size={1} muted>
          {plan.plan.chained.join(', ')} already redirect{plan.plan.chained.length === 1 ? 's' : ''}{' '}
          to {change.from} and will take an extra step. Point them at {change.to} under Redirects.
        </Text>
      ) : null}
    </Stack>
  )
}

/** Wraps Publish on pages and posts; every other action and type is left as it was. */
export const confirmPublishActions: DocumentActionsResolver = (prev, { schemaType }) =>
  CONFIRMED_PUBLISH_TYPES.has(schemaType)
    ? prev.map((action) => (action.action === 'publish' ? withConfirmPublish(action) : action))
    : prev
