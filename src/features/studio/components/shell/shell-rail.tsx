import { CogIcon } from '@sanity/icons/Cog'
import { DocumentsIcon } from '@sanity/icons/Documents'
import { DoubleChevronLeftIcon } from '@sanity/icons/DoubleChevronLeft'
import { DoubleChevronRightIcon } from '@sanity/icons/DoubleChevronRight'
import { PlugIcon } from '@sanity/icons/Plug'
import { StackIcon } from '@sanity/icons/Stack'
import { Box, Button, Card, Flex, Stack, Text, useMediaIndex } from '@sanity/ui'
import { Tooltip } from '@sanity/ui/tooltip'
import {
  type ComponentType,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from 'react'
import { type ActiveToolLayoutProps, useCurrentUser, useTools } from 'sanity'
import { useRouter, useRouterState } from 'sanity/router'

import { studioUrl } from '@/config/env'

import { SHELL_WIDE_INDEX, SHELL_ZONE_WIDTH } from './shell-navbar'
import {
  readRailChoice,
  requestFocusAfterNavigation,
  subscribeRail,
  takePendingFocus,
  writeRailChoice,
} from './shell-rail-state'
import { currentAudience } from '../../roles'
import { filterStructureItems } from '../../utils/structure-access'

/** VD-009: 60–68 px compact. */
const COMPACT_WIDTH = 64
/** Below Sanity UI's fourth breakpoint (1200 px) the rail starts compact. */
const ROOMY_INDEX = 4

/** Structure's top-level groups the concept lists under "Content", by Structure item id. */
const CONTENT_LINKS: { id: string; title: string; icon: ComponentType }[] = [
  { id: 'pages', title: 'Pages', icon: DocumentsIcon },
  { id: 'reusable', title: 'Reusable content', icon: StackIcon },
  { id: 'websiteSettings', title: 'Website settings', icon: CogIcon },
]

function useCompact(mediaIndex: number): boolean {
  const saved = useSyncExternalStore(subscribeRail, readRailChoice, () => null)
  return saved ? saved === 'compact' : mediaIndex < ROOMY_INDEX
}

/**
 * Where a rail entry goes, as an absolute Studio path. The rail renders inside the active tool's
 * scoped router, where ToolLink and StateLink cannot resolve another tool, so it builds URLs.
 */
interface RailTarget {
  href: string
  navigate: () => void
}

const plainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)

/** One rail entry: label beside the icon when expanded, icon with a tooltip when compact. */
function RailItem({
  compact,
  focusKey,
  title,
  icon,
  selected,
  treatment = 'selected',
  target,
}: {
  compact: boolean
  focusKey: string
  title: string
  icon: ComponentType | undefined
  selected: boolean
  /** The active tool is `selected`; a content link inside it gets the lighter outlined look. */
  treatment?: 'selected' | 'outlined'
  target: RailTarget
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  // After a tool change the new tool's rail mounts: put focus back on the link the editor used.
  useEffect(() => {
    if (selected && takePendingFocus(focusKey)) ref.current?.focus()
  }, [focusKey, selected])

  const shared = {
    ref,
    icon: icon ?? PlugIcon,
    text: compact ? undefined : title,
    'aria-label': compact ? title : undefined,
    'aria-current': selected ? ('page' as const) : undefined,
    selected: treatment === 'selected' && selected,
    mode: treatment === 'outlined' && selected ? ('ghost' as const) : ('bleed' as const),
    padding: 3,
    justify: compact ? ('center' as const) : ('flex-start' as const),
    width: 'fill' as const,
  }
  return (
    <Box as="li">
      <Tooltip
        content={<Text size={1}>{title}</Text>}
        placement="right"
        padding={2}
        portal
        disabled={!compact}
      >
        <Button
          {...shared}
          as="a"
          href={target.href}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            if (!plainClick(event)) return
            event.preventDefault()
            requestFocusAfterNavigation(focusKey)
            target.navigate()
          }}
        />
      </Tooltip>
    </Box>
  )
}

function RailGroup({
  label,
  compact,
  children,
}: {
  label: string
  compact: boolean
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <Stack gap={2}>
      {compact ? null : (
        <Box paddingX={3} paddingTop={2}>
          <Text id={id} size={0} muted weight="medium" style={{ letterSpacing: '0.08em' }}>
            {label.toUpperCase()}
          </Text>
        </Box>
      )}
      <Stack
        as="ul"
        gap={1}
        aria-label={compact ? label : undefined}
        aria-labelledby={compact ? undefined : id}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {children}
      </Stack>
    </Stack>
  )
}

function ShellRail({ activeToolName }: { activeToolName: string }) {
  const tools = useTools()
  const mediaIndex = useMediaIndex()
  const compact = useCompact(mediaIndex)
  const audience = currentAudience(useCurrentUser())
  const router = useRouter()
  // Re-render on navigation so the content links' selected state follows the address.
  useRouterState()
  const path = window.location.pathname
  const contentLinks = filterStructureItems(CONTENT_LINKS, audience, ({ id }) => id)
  // Keep the query (perspective and other sticky parameters) when moving between tools.
  const railTarget = (to: string): RailTarget => {
    const href = `${studioUrl}${to}${window.location.search}`
    return {
      href,
      navigate: () => {
        router.navigateUrl({ path: href })
      },
    }
  }

  return (
    <Card
      as="nav"
      aria-label="Studio"
      borderRight
      flex="none"
      overflow="auto"
      style={{ width: compact ? COMPACT_WIDTH : SHELL_ZONE_WIDTH }}
    >
      <Flex direction="column" height="fill" padding={2} gap={4}>
        <RailGroup label="Studio" compact={compact}>
          {tools.map((tool) => (
            <RailItem
              key={tool.name}
              compact={compact}
              focusKey={`tool:${tool.name}`}
              title={tool.title}
              icon={tool.icon}
              selected={tool.name === activeToolName}
              target={railTarget(`/${tool.name}`)}
            />
          ))}
        </RailGroup>
        {contentLinks.length > 0 && (
          <RailGroup label="Content" compact={compact}>
            {contentLinks.map((link) => (
              <RailItem
                key={link.id}
                compact={compact}
                focusKey={`content:${link.id}`}
                title={link.title}
                icon={link.icon}
                selected={path.startsWith(`${studioUrl}/structure/${link.id}`)}
                treatment="outlined"
                target={railTarget(`/structure/${link.id}`)}
              />
            ))}
          </RailGroup>
        )}
        <Box flex={1} />
        <Button
          mode="bleed"
          padding={3}
          justify={compact ? 'center' : 'flex-start'}
          icon={compact ? DoubleChevronRightIcon : DoubleChevronLeftIcon}
          text={compact ? undefined : 'Collapse menu'}
          aria-label={compact ? 'Expand menu' : undefined}
          aria-expanded={!compact}
          onClick={() => {
            writeRailChoice(compact ? 'expanded' : 'compact')
          }}
        />
      </Flex>
    </Card>
  )
}

/**
 * SPIKE (task 174): the concept's left rail, drawn beside every tool through
 * `studio.components.activeToolLayout`, so it sits under the top bar. From 900 px only; narrower
 * screens keep Sanity's drawer.
 */
export function ShellToolLayout(props: ActiveToolLayoutProps) {
  const wide = useMediaIndex() >= SHELL_WIDE_INDEX
  if (!wide) return props.renderDefault(props)
  return (
    <Flex height="fill" style={{ minHeight: 0 }}>
      <ShellRail activeToolName={props.activeTool.name} />
      <Box flex={1} style={{ minWidth: 0, height: '100%' }}>
        {props.renderDefault(props)}
      </Box>
    </Flex>
  )
}
