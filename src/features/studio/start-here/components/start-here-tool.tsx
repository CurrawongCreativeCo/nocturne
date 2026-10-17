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
  Tab,
  TabList,
  TabPanel,
  Text,
} from '@sanity/ui'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useClient, useCurrentUser, useSchema, useUser } from 'sanity'
import { IntentLink, useRouter } from 'sanity/router'

import { apiVersion, studioUrl } from '@/config/env'
import { siteProfile } from '@/config/profile'
import type { START_HERE_QUERY_RESULT } from '@/types/sanity.types'

import { EditorGuide } from './editor-guide'
import { HelpPanel } from './help-panel'
import { OpsNotices, useOpsNotices } from './ops-notices'
import { currentAudience } from '../../roles'
import { isTypeVisible } from '../../utils/feature-visibility'
import { fetchLastChanges } from '../api/last-changes'
import { START_HERE_QUERY } from '../api/query'
import { editorGuide } from '../utils/editor-guide'
import {
  buildQuickActions,
  toolHref,
  type ActionTarget,
  type QuickAction,
} from '../utils/quick-actions'
import { buildRecentChanges, isTypeShown, type RecentChange } from '../utils/recent'
import { formatRelativeTime } from '../utils/relative-time'
import { buildThingsToCheck, type ThingsToCheck } from '../utils/things-to-check'
import type { LastChange } from '../utils/transactions'
import { displayTitle, greeting, welcomeLine } from '../utils/wording'

interface Data {
  recent: RecentChange[]
  changes: Map<string, LastChange>
  checks: ThingsToCheck
}

type TabName = 'overview' | 'help'

type State =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Data }

const ACTION_GRID_STYLE = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))',
} as const

const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0 } as const

/**
 * The first screen a client sees: quick actions, the latest changes and a few things to check.
 * Read-only. One content query, one history request, and (when OPS_NOTICES_URL is set) one call to
 * the site's own notices route.
 */
export function StartHereTool() {
  const client = useClient({ apiVersion })
  const schema = useSchema()
  const user = useCurrentUser()
  const router = useRouter()
  const audience = currentAudience(user)
  const notices = useOpsNotices()
  const helpHeading = useRef<HTMLHeadingElement>(null)
  const focusHelpHeading = useRef(false)
  const [tab, setTab] = useState<TabName>('overview')
  const [state, setState] = useState<State>({ status: 'loading' })

  const schemaTypes = useMemo(() => new Set(schema.getTypeNames()), [schema])
  const typeTitle = useMemo(() => (type: string) => schema.get(type)?.title ?? type, [schema])
  const actions = useMemo(() => buildQuickActions(siteProfile, schemaTypes), [schemaTypes])

  useEffect(() => {
    const controller = new AbortController()
    const shown = (type: string) => isTypeShown(type, audience, isTypeVisible)
    client
      // `raw` returns drafts beside published documents; the default perspective hides drafts.
      .fetch<START_HERE_QUERY_RESULT>(
        START_HERE_QUERY,
        {},
        {
          perspective: 'raw',
          signal: controller.signal,
        },
      )
      .then(async (result) => {
        const recent = buildRecentChanges(result.recent, shown)
        const changes = await fetchLastChanges(
          client,
          recent.map(({ id }) => id),
          controller.signal,
        )
        if (controller.signal.aborted) return
        const checks = buildThingsToCheck(result, {
          now: Date.now(),
          includeSharedSections: audience === 'agency',
          shown,
          typeTitle,
        })
        setState({ status: 'ready', data: { recent, changes, checks } })
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
  }, [client, audience, typeTitle])

  // The Help tab mounts after the click, so the heading is focused once it is there.
  useEffect(() => {
    if (tab !== 'help' || !focusHelpHeading.current) return
    focusHelpHeading.current = false
    helpHeading.current?.focus()
  }, [tab])

  const showHelp = () => {
    focusHelpHeading.current = true
    setTab('help')
  }

  return (
    <Box padding={[3, 4, 5]} style={{ height: '100%', overflow: 'auto' }}>
      <Container width={2}>
        <Stack gap={[5, 5, 6]}>
          <Stack gap={3}>
            <Heading as="h1" size={3}>
              {greeting(user?.name)}
            </Heading>
            <Text muted size={2}>
              {welcomeLine(siteProfile.client.name)}
            </Text>
          </Stack>

          <OpsNotices notices={notices} />

          <Stack gap={4}>
            <TabList gap={2}>
              <Tab
                aria-controls="start-here-panel-overview"
                id="start-here-tab-overview"
                label="Overview"
                selected={tab === 'overview'}
                onClick={() => {
                  setTab('overview')
                }}
              />
              <Tab
                aria-controls="start-here-panel-help"
                id="start-here-tab-help"
                label="Help"
                selected={tab === 'help'}
                onClick={() => {
                  setTab('help')
                }}
              />
            </TabList>

            {tab === 'overview' && (
              <TabPanel aria-labelledby="start-here-tab-overview" id="start-here-panel-overview">
                <Stack gap={[5, 5, 6]}>
                  <Stack as="section" gap={4} aria-labelledby="start-here-actions">
                    <Heading as="h2" size={1} id="start-here-actions">
                      What would you like to do?
                    </Heading>
                    <div role="list" style={ACTION_GRID_STYLE}>
                      {actions.map((action) => (
                        <div key={action.id} role="listitem">
                          <ActionCard
                            action={action}
                            resolveIntent={router.resolveIntentLink}
                            navigate={(path) => {
                              router.navigateUrl({ path })
                            }}
                            onHelp={showHelp}
                          />
                        </div>
                      ))}
                    </div>
                  </Stack>

                  {state.status === 'loading' && (
                    <Flex align="center" gap={3} role="status">
                      <Spinner muted />
                      <Text muted size={1}>
                        Loading your latest changes…
                      </Text>
                    </Flex>
                  )}
                  {state.status === 'error' && (
                    <Card tone="critical" padding={4} radius={2} role="alert">
                      <Text size={1}>Could not load your latest changes: {state.message}</Text>
                    </Card>
                  )}
                  {state.status === 'ready' && (
                    <>
                      <RecentChanges
                        recent={state.data.recent}
                        changes={state.data.changes}
                        typeTitle={typeTitle}
                        currentUserId={user?.id}
                      />
                      <ThingsToCheckList checks={state.data.checks} />
                    </>
                  )}
                </Stack>
              </TabPanel>
            )}

            {tab === 'help' && (
              <TabPanel aria-labelledby="start-here-tab-help" id="start-here-panel-help">
                <HelpPanel
                  ref={helpHeading}
                  guideUrl={siteProfile.help.guideUrl}
                  supportEmail={siteProfile.help.supportEmail}
                >
                  <EditorGuide guide={editorGuide} videos={siteProfile.help.videos} />
                </HelpPanel>
              </TabPanel>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

/** Navigates inside the Studio on a plain click; leaves "open in a new tab" clicks to the browser. */
function studioClick(event: MouseEvent<HTMLAnchorElement>, go: () => void) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  go()
}

function ActionCard({
  action,
  resolveIntent,
  navigate,
  onHelp,
}: {
  action: QuickAction
  resolveIntent: (intent: string, params: { type: string; id?: string }) => string
  navigate: (path: string) => void
  onHelp: () => void
}) {
  const href = actionHref(action.target, resolveIntent)
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    studioClick(event, () => {
      if (action.target.kind === 'help') onHelp()
      else navigate(href)
    })
  }
  return (
    <Card
      as="a"
      href={href}
      onClick={onClick}
      padding={4}
      radius={3}
      shadow={1}
      height="fill"
      style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
      __unstable_focusRing
    >
      <Stack gap={3}>
        <Text size={2} weight="semibold">
          {action.title}
        </Text>
        <Text size={1} muted>
          {action.description}
        </Text>
      </Stack>
    </Card>
  )
}

function actionHref(
  target: ActionTarget,
  resolveIntent: (intent: string, params: { type: string; id?: string }) => string,
): string {
  switch (target.kind) {
    case 'tool':
      return toolHref(target, studioUrl)
    case 'intent':
      return resolveIntent(target.intent, target.params)
    case 'help':
      return '#start-here-help'
  }
}

function RecentChanges({
  recent,
  changes,
  typeTitle,
  currentUserId,
}: {
  recent: RecentChange[]
  changes: Map<string, LastChange>
  typeTitle: (type: string) => string
  currentUserId?: string
}) {
  return (
    <Stack as="section" gap={4} aria-labelledby="start-here-recent">
      <Heading as="h2" size={1} id="start-here-recent">
        Recent changes
      </Heading>
      {recent.length === 0 ? (
        <Card padding={4} radius={3} border>
          <Text size={1} muted>
            Nothing has been changed yet.
          </Text>
        </Card>
      ) : (
        <Stack as="ul" gap={2} style={LIST_STYLE}>
          {recent.map((item) => (
            <Card key={item.id} as="li" padding={3} radius={2} border>
              <Stack gap={2}>
                <Flex align="center" gap={2} wrap="wrap">
                  <Text size={1} weight="medium">
                    <IntentLink intent="edit" params={{ id: item.id, type: item.type }}>
                      {displayTitle(item.title, typeTitle(item.type))}
                    </IntentLink>
                  </Text>
                  {item.isDraft && (
                    <Badge tone="caution" fontSize={0}>
                      Draft
                    </Badge>
                  )}
                </Flex>
                <Text muted size={1}>
                  {typeTitle(item.type)} · {formatRelativeTime(item.updatedAt)}
                  <ChangedBy userId={changes.get(item.id)?.author} currentUserId={currentUserId} />
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

/** " · by Ann Lee" (or "by you"). Nothing until the name loads, or when the history had none. */
function ChangedBy({ userId, currentUserId }: { userId?: string; currentUserId?: string }) {
  if (!userId) return null
  if (userId === currentUserId) return <> · by you</>
  return <ChangedByUser userId={userId} />
}

function ChangedByUser({ userId }: { userId: string }) {
  const [user] = useUser(userId)
  return user?.displayName ? <> · by {user.displayName}</> : null
}

function ThingsToCheckList({ checks }: { checks: ThingsToCheck }) {
  const router = useRouter()
  return (
    <Stack as="section" gap={4} aria-labelledby="start-here-checks">
      <Heading as="h2" size={1} id="start-here-checks">
        Things to check
      </Heading>
      {checks.items.length === 0 ? (
        <Card tone="positive" padding={4} radius={3} border>
          <Text size={1}>All good. Nothing needs your attention.</Text>
        </Card>
      ) : (
        <Stack as="ul" gap={2} style={LIST_STYLE}>
          {checks.items.map((item) => (
            <Card key={item.key} as="li" padding={3} radius={2} border>
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Box flex={1} style={{ minWidth: '12rem' }}>
                  <Text size={1}>{item.message}</Text>
                </Box>
                <Button
                  as="a"
                  href={router.resolveIntentLink('edit', { id: item.id, type: item.type })}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    studioClick(event, () => {
                      router.navigateIntent('edit', { id: item.id, type: item.type })
                    })
                  }}
                  text="Fix it"
                  mode="ghost"
                  fontSize={1}
                />
              </Flex>
            </Card>
          ))}
          {checks.more > 0 && (
            <Text muted size={1}>
              And {checks.more} more. Fix these first and the rest will show up here.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  )
}
