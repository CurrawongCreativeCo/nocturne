/**
 * Publish confirmation. Wraps Sanity's own Publish action (so validation, labels and progress stay
 * Sanity's) behind a dialog naming the address that goes live for pages and posts, shown for a first
 * publish and for an address change only (needsPublishConfirmation). When the published slug and
 * the draft's differ, the dialog offers to leave a redirect from the old address.
 *
 * For agency staff, on every document type, the dialog also lists changes to fields outside the
 * client-editable allowlist and who made them, since a Contributor's draft can carry a design
 * change they should not have been able to save (utils/protected-changes.ts).
 */
import { Box, Button, Card, Checkbox, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useToast } from '@sanity/ui/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useClient,
  useCurrentUser,
  type DocumentActionComponent,
  type DocumentActionDescription,
  type DocumentActionProps,
  type DocumentActionsResolver,
} from 'sanity'

import { apiVersion } from '@/config/env'
import {
  detectAddressChange,
  documentPath,
  joinUrl,
  readSlug,
  type AddressChange,
} from '@/lib/sanity/document-address'
import { diffProtectedFields, type ProtectedChange } from '@/lib/sanity/protected-changes'

import { ProtectedChangesList } from '../components/protected-changes-list'
import { resolveVersions, type RedirectRule } from '../content-health/utils/detect'
import { isAgency } from '../roles'
import { fetchChangeAuthors } from '../utils/fetch-change-history'
import {
  buildRedirectDocument,
  CONFIRMED_PUBLISH_TYPES,
  needsPublishConfirmation,
  planRedirect,
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

/** Who made the protected changes found when Publish was pressed; `authors` is null if the history could not be read. */
interface Authorship {
  draftRev: string | undefined
  authors: ReadonlyMap<string, string> | null
}

export function withConfirmPublish(Publish: DocumentActionComponent): DocumentActionComponent {
  const ConfirmPublish: DocumentActionComponent = (props: DocumentActionProps) => {
    const { draft, published, type, release } = props
    const client = useClient({ apiVersion })
    const toast = useToast()
    const currentUser = useCurrentUser()
    const [open, setOpen] = useState(false)
    const [createRedirect, setCreateRedirect] = useState(true)
    const [lookup, setLookup] = useState<Lookup | null>(null)
    // Protected-field changes found when Publish was pressed, and who made them.
    const [protectedChanges, setProtectedChanges] = useState<ProtectedChange[]>([])
    const [authorship, setAuthorship] = useState<Authorship | null>(null)
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

    const draftRev = draft?._rev
    const hasProtectedChanges = protectedChanges.length > 0
    useEffect(() => {
      if (!open || !hasProtectedChanges || !draft || !published) return
      const controller = new AbortController()
      fetchChangeAuthors(client, type, draft._id, published, controller.signal)
        .then((authors) => {
          setAuthorship({ draftRev, authors })
        })
        .catch(() => {
          if (!controller.signal.aborted) setAuthorship({ draftRev, authors: null })
        })
      return () => {
        controller.abort()
      }
      // The draft and published documents change identity on every keystroke; a revision is enough.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, hasProtectedChanges, draftRev, client, type])

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

    if (!original || release) return original
    const addressTyped = CONFIRMED_PUBLISH_TYPES.has(type)

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
        // Staff are the only people whose Publish can release a client's protected change.
        const found =
          draft && published && isAgency(currentUser)
            ? diffProtectedFields(type, published, draft)
            : []
        setProtectedChanges(found)
        // An edit to a live page at the same address has nothing to confirm.
        const addressCheck = addressTyped && needsPublishConfirmation(Boolean(published), change)
        if (!addressCheck && found.length === 0) {
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
            {hasProtectedChanges ? (
              <ProtectedChangesList
                changes={protectedChanges}
                authors={authorship && authorship.draftRev === draftRev ? authorship.authors : null}
                loading={authorship?.draftRev !== draftRev}
              />
            ) : null}
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

/** Wraps Publish on every type; every other action is left as it was. */
export const confirmPublishActions: DocumentActionsResolver = (prev) =>
  prev.map((action) => (action.action === 'publish' ? withConfirmPublish(action) : action))
