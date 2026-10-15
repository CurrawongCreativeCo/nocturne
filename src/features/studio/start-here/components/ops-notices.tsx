import { Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'

import { parseNotices, type NoticeTone, type OpsNotice } from '@/lib/ops/notices'

const CARD_TONE: Record<NoticeTone, 'primary' | 'caution' | 'critical'> = {
  info: 'primary',
  caution: 'caution',
  critical: 'critical',
}

/** Notices relayed by the site's server route; nothing at all when they are not set up or fail. */
export function useOpsNotices(): OpsNotice[] {
  const [notices, setNotices] = useState<OpsNotice[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ops-notices', { signal: controller.signal })
      .then((response) => (response.status === 200 ? response.json() : null))
      .then((payload: unknown) => {
        if (!controller.signal.aborted) setNotices(parseNotices(payload))
      })
      .catch(() => {
        // Skipped silently: notices are a courtesy and must never get in the way.
      })
    return () => {
      controller.abort()
    }
  }, [])
  return notices
}

export function OpsNotices({ notices }: { notices: OpsNotice[] }) {
  if (notices.length === 0) return null
  return (
    <Stack as="section" gap={3} aria-label="Notices">
      {notices.map((notice) => (
        <Card key={notice.id} tone={CARD_TONE[notice.tone]} padding={4} radius={3} border>
          <Stack gap={3}>
            <Text weight="semibold" size={2}>
              {notice.title}
            </Text>
            {notice.body && <Text size={1}>{notice.body}</Text>}
            {notice.url && (
              <Flex>
                <Text size={1}>
                  <a href={notice.url} target="_blank" rel="noopener noreferrer">
                    Find out more (opens in a new tab)
                  </a>
                </Text>
              </Flex>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
