import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { CircleIcon } from '@sanity/icons/Circle'
import { InfoOutlineIcon } from '@sanity/icons/InfoOutline'
import { Badge, Box, Button, Card, Container, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useId, type ReactNode } from 'react'

import type { ChecklistFix, ChecklistItem } from '../utils/launch-checklist'
import type { LaunchViewModel } from '../utils/launch-view'
import { DOMAINS_NOTE, README_LAUNCH_URL, launchSteps } from '../utils/launch-wording'

const LIST_STYLE = { listStyle: 'none', margin: 0, padding: 0 } as const

/** How the screen opens a document for editing: the Studio passes an intent link, the preview a plain button. */
export type RenderEditLink = (
  target: { intent: 'create' | 'edit'; type: string; id?: string },
  label: string,
) => ReactNode

interface Props {
  view: LaunchViewModel
  /** Whether to show the agency's checklist and preview links (clients get a sentence and a button). */
  agency: boolean
  /** Opens Presentation at "/" (the full site, with a preview pass). */
  previewHref: string
  renderEditLink: RenderEditLink
  /** The screen's title level: a pane has its own page, the brand preview nests four of them. */
  titleAs?: 'h1' | 'h3'
}

const linkButton = (href: string, text: string, mode: 'default' | 'ghost' = 'ghost') => (
  <Button
    as="a"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    text={text}
    mode={mode}
    fontSize={1}
  />
)

/**
 * The Launch & visibility screen (README, "Launch state in Studio"): read-only. It shows what
 * visitors get today and, for agency staff, what is left before launch. It stores nothing and has
 * no field; the state is `launch` in `site.profile.ts`. Only Sanity UI components and tones, so the
 * CMS brand and Studio dark mode apply.
 */
export function LaunchScreen({ view, agency, previewHref, renderEditLink, titleAs = 'h1' }: Props) {
  const id = useId()
  const sectionLevel = titleAs === 'h1' ? 'h2' : 'h4'
  return (
    <Box padding={[3, 4, 5]} style={{ height: '100%', overflow: 'auto' }}>
      <Container width={2}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Heading as={titleAs} size={3}>
              Launch &amp; visibility
            </Heading>
            <Card
              tone={view.tone}
              padding={4}
              radius={3}
              border
              role="status"
              data-launch-status={view.status}
            >
              <Flex align="center" gap={3}>
                <Text size={2} aria-hidden>
                  <InfoOutlineIcon />
                </Text>
                <Text size={2} weight="semibold">
                  {view.headline}
                </Text>
              </Flex>
            </Card>
          </Stack>

          {!agency && view.status === 'prelaunch' && (
            <Flex gap={3} wrap="wrap">
              {view.linkPage
                ? renderEditLink(
                    { intent: 'edit', type: 'page', id: view.linkPage.id },
                    'Edit your links',
                  )
                : null}
            </Flex>
          )}

          {agency && (
            <Flex gap={3} wrap="wrap">
              {linkButton(view.temporaryUrl, 'Open the temporary page', 'default')}
              <Button
                as="a"
                href={previewHref}
                text="Preview the full site"
                mode="ghost"
                fontSize={1}
              />
            </Flex>
          )}

          {agency && view.publicPages.length > 0 && (
            <Stack as="section" gap={3} aria-labelledby={`${id}-pages`}>
              <Heading as={sectionLevel} size={1} id={`${id}-pages`}>
                Pages visitors can open
              </Heading>
              <Stack as="ul" gap={2} style={LIST_STYLE}>
                {view.publicPages.map((page) => (
                  <Card key={page.slug} as="li" padding={3} radius={2} border>
                    <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                      <Stack gap={2} flex={1} style={{ minWidth: '12rem' }}>
                        <Text size={1} weight="medium">
                          {page.title}
                        </Text>
                        <Text size={1} muted>
                          {page.path}
                          {page.id === null ? ' · not published yet' : ''}
                        </Text>
                      </Stack>
                      {page.id !== null && (
                        <Flex gap={2}>
                          {linkButton(new URL(page.path, view.temporaryUrl).toString(), 'Open')}
                          {renderEditLink({ intent: 'edit', type: 'page', id: page.id }, 'Edit')}
                        </Flex>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}

          {agency && view.checklist.length > 0 && (
            <Stack as="section" gap={3} aria-labelledby={`${id}-checklist`}>
              <Flex align="center" gap={3}>
                <Heading as={sectionLevel} size={1} id={`${id}-checklist`}>
                  Before launch
                </Heading>
                <Badge
                  tone={view.progress.done === view.progress.total ? 'positive' : 'caution'}
                  fontSize={0}
                >
                  {view.progress.done} of {view.progress.total} done
                </Badge>
              </Flex>
              <Stack as="ul" gap={2} style={LIST_STYLE}>
                {view.checklist.map((item) => (
                  <ChecklistRow key={item.id} item={item} renderEditLink={renderEditLink} />
                ))}
              </Stack>
            </Stack>
          )}

          {agency && view.status === 'prelaunch' && (
            <Stack as="section" gap={3} aria-labelledby={`${id}-how`}>
              <Heading as={sectionLevel} size={1} id={`${id}-how`}>
                How to launch
              </Heading>
              <Stack as="ol" gap={3} style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
                {launchSteps(view.domain).map((step) => (
                  <li key={step}>
                    <Text size={1}>{step}</Text>
                  </li>
                ))}
              </Stack>
              <Text size={1} muted>
                The full steps are in the README, under{' '}
                <a href={README_LAUNCH_URL} target="_blank" rel="noopener noreferrer">
                  Pre-launch and launch
                </a>
                . {DOMAINS_NOTE}
              </Text>
            </Stack>
          )}

          <Text size={1} muted>
            Your site address: {view.domain}. {DOMAINS_NOTE}
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}

function ChecklistRow({
  item,
  renderEditLink,
}: {
  item: ChecklistItem
  renderEditLink: RenderEditLink
}) {
  const done = item.status === 'done'
  const fix: ChecklistFix | undefined = item.fix
  return (
    <Card
      as="li"
      padding={3}
      radius={2}
      border
      tone={item.status === 'reminder' ? 'caution' : 'default'}
      data-check-status={item.status}
    >
      <Flex align="center" gap={3} wrap="wrap">
        <Text size={2} aria-hidden>
          {done ? <CheckmarkCircleIcon /> : <CircleIcon />}
        </Text>
        <Stack gap={2} flex={1} style={{ minWidth: '12rem' }}>
          <Text size={1} weight="medium">
            {item.label}
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              {done ? ' (done)' : item.status === 'reminder' ? ' (reminder)' : ' (to do)'}
            </span>
          </Text>
          {item.detail && (
            <Text size={1} muted>
              {item.detail}
            </Text>
          )}
        </Stack>
        {fix && !done && renderEditLink(fix, fix.intent === 'create' ? 'Create' : 'Fix it')}
      </Flex>
    </Card>
  )
}
