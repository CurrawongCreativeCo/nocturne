import { DesktopIcon } from '@sanity/icons/Desktop'
import { LaunchIcon } from '@sanity/icons/Launch'
import { MobileDeviceIcon } from '@sanity/icons/MobileDevice'
import { SyncIcon } from '@sanity/icons/Sync'
import { Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient, useCurrentUser } from 'sanity'
import { useIntentLink } from 'sanity/router'
import type { UserViewComponent } from 'sanity/structure'

import { apiVersion } from '@/config/env'

import { getPreviewSecret } from '../utils/preview-secret'
import { enableUrl, isPreviewType, previewPath } from '../utils/preview-url'
import { siteOrigin } from '../utils/site-origin'

const PHONE_WIDTH = 390
/** How long the page gets to load before the view gives up and offers "Try again". */
const LOAD_TIMEOUT_MS = 20_000
/** The preview waits for the form to draw first; this is the longest it will wait for an idle moment. */
const IDLE_TIMEOUT_MS = 1500

export type PreviewStatus = 'no-address' | 'preparing' | 'loading' | 'ready' | 'error'
export type PreviewWidth = 'desktop' | 'phone'

interface PreviewPanelProps {
  status: PreviewStatus
  /** The enable-route URL; null until the secret is ready. */
  src: string | null
  /** Changes when the iframe must start again (new page, Refresh). */
  frameKey: string
  title: string
  width: PreviewWidth
  onWidth: (width: PreviewWidth) => void
  onRefresh: () => void
  onTryAgain: () => void
  onLoad: () => void
  /** "Open in Presentation", a link that needs Studio's router, so the container supplies it. */
  presentationLink: React.ReactNode
}

/** The toolbar and the frame, with no data of its own, so every state can be rendered in a test. */
export function PreviewPanel(props: PreviewPanelProps) {
  const { status, src, frameKey, title, width, onWidth, onRefresh, onTryAgain, onLoad } = props
  const busy = status === 'preparing' || status === 'loading'

  if (status === 'no-address') {
    return (
      <Card height="fill" padding={4} tone="transparent">
        <Text size={1} muted>
          Add an address to preview this page
        </Text>
      </Card>
    )
  }

  return (
    <Flex direction="column" height="fill">
      <Card borderBottom padding={2}>
        <Flex align="center" gap={2} wrap="wrap">
          <Button
            icon={SyncIcon}
            mode="bleed"
            text="Refresh"
            fontSize={1}
            onClick={onRefresh}
            disabled={status === 'error'}
          />
          <Button
            icon={DesktopIcon}
            mode={width === 'desktop' ? 'default' : 'bleed'}
            aria-label="Desktop width"
            aria-pressed={width === 'desktop'}
            fontSize={1}
            onClick={() => {
              onWidth('desktop')
            }}
          />
          <Button
            icon={MobileDeviceIcon}
            mode={width === 'phone' ? 'default' : 'bleed'}
            aria-label="Phone width"
            aria-pressed={width === 'phone'}
            fontSize={1}
            onClick={() => {
              onWidth('phone')
            }}
          />
          <Box flex={1} />
          {props.presentationLink}
        </Flex>
      </Card>
      <Card flex={1} tone="transparent" style={{ position: 'relative', overflow: 'auto' }}>
        {status === 'error' ? (
          <Stack gap={3} padding={4}>
            <Text size={1} weight="semibold">
              The preview didn&rsquo;t load
            </Text>
            <Text size={1} muted>
              Your changes are safe. Check your connection and try again.
            </Text>
            <Box>
              <Button text="Try again" tone="primary" fontSize={1} onClick={onTryAgain} />
            </Box>
          </Stack>
        ) : (
          <>
            {busy && (
              <Flex
                align="center"
                justify="center"
                gap={3}
                padding={4}
                role="status"
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                <Spinner muted />
                <Text size={1} muted>
                  Loading preview
                </Text>
              </Flex>
            )}
            {src && (
              <iframe
                key={frameKey}
                src={src}
                title={title}
                onLoad={onLoad}
                style={{
                  display: 'block',
                  border: 0,
                  height: '100%',
                  width: width === 'phone' ? PHONE_WIDTH : '100%',
                  margin: '0 auto',
                  background: 'white',
                  opacity: status === 'ready' ? 1 : 0,
                }}
              />
            )}
          </>
        )}
      </Card>
    </Flex>
  )
}

function PresentationLink(props: { id: string; type: string; path: string }) {
  const { href, onClick } = useIntentLink({
    intent: 'edit',
    params: { id: props.id, type: props.type, mode: 'presentation', preview: props.path },
  })
  return (
    <Button
      as="a"
      href={href}
      onClick={onClick}
      icon={LaunchIcon}
      mode="bleed"
      text="Open in Presentation"
      fontSize={1}
    />
  )
}

/**
 * Structure's Preview view for pages and posts: a tab beside the form, or beside it in a split pane. The
 * iframe goes through the site's draft-mode enable route with a secret like Presentation's, so
 * unsaved drafts show and update through SanityLive. It has no click-to-edit overlays: that is
 * what Presentation is for.
 */
export const PreviewView: UserViewComponent = ({ document, documentId, schemaType }) => {
  const client = useClient({ apiVersion })
  const user = useCurrentUser()
  const userId = user?.id
  const type = schemaType.name
  const slug = (document.displayed.slug as { current?: string } | undefined)?.current
  const path = isPreviewType(type) ? previewPath(type, slug) : null

  const [secret, setSecret] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [reloads, setReloads] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null)
  const [width, setWidth] = useState<PreviewWidth>('desktop')
  const wantsPreview = path !== null

  // The secret waits for an idle moment so the form is on screen first; opening a document is
  // never held up by the preview.
  useEffect(() => {
    if (!wantsPreview) return
    let cancelled = false
    const start = () => {
      getPreviewSecret(client, window.location.href, userId, { fresh: attempt > 0 })
        .then((next) => {
          if (!cancelled) setSecret(next)
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    }
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS })
      return () => {
        cancelled = true
        window.cancelIdleCallback(handle)
      }
    }
    const handle = window.setTimeout(start, 0)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [client, userId, wantsPreview, attempt])

  const frameKey = `${path ?? ''}#${String(reloads)}`
  const src = useMemo(
    () => (secret && path ? enableUrl(siteOrigin(), path, secret) : null),
    [secret, path],
  )
  const loaded = loadedKey === frameKey

  useEffect(() => {
    if (!src || loaded) return
    const timer = window.setTimeout(() => {
      setTimedOutKey(frameKey)
    }, LOAD_TIMEOUT_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [src, loaded, frameKey])

  let status: PreviewStatus
  if (!path) status = 'no-address'
  else if (failed || (timedOutKey === frameKey && !loaded)) status = 'error'
  else if (!src) status = 'preparing'
  else status = loaded ? 'ready' : 'loading'

  const onTryAgain = useCallback(() => {
    setFailed(false)
    setSecret(null)
    setTimedOutKey(null)
    setReloads((n) => n + 1)
    setAttempt((n) => n + 1)
  }, [])

  return (
    <PreviewPanel
      status={status}
      src={src}
      frameKey={frameKey}
      title={`Preview of ${(document.displayed.title as string | undefined) || 'this page'}`}
      width={width}
      onWidth={setWidth}
      onRefresh={() => {
        setLoadedKey(null)
        setReloads((n) => n + 1)
      }}
      onTryAgain={onTryAgain}
      onLoad={() => {
        setLoadedKey(frameKey)
      }}
      presentationLink={
        path ? <PresentationLink id={documentId} type={type} path={path} /> : undefined
      }
    />
  )
}
