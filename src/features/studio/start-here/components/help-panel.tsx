import { CopyIcon } from '@sanity/icons/Copy'
import { LaunchIcon } from '@sanity/icons/Launch'
import { Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  guideUrl?: string
  supportEmail?: string
  /** Shown under the guide link and support address: the editor guide. */
  children?: ReactNode
}

const COPIED_MS = 3000

/** Where to learn more: the client's guide, the support address to copy until the support form exists, and the editor guide. */
export const HelpPanel = forwardRef<HTMLHeadingElement, Props>(function HelpPanel(
  { guideUrl, supportEmail, children },
  headingRef,
) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    if (!supportEmail) return
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(supportEmail)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    timer.current = setTimeout(() => {
      setStatus('idle')
    }, COPIED_MS)
  }

  return (
    <Stack as="section" id="start-here-help" gap={4} aria-labelledby="start-here-help-heading">
      <Heading as="h2" size={1} id="start-here-help-heading" ref={headingRef} tabIndex={-1}>
        Help
      </Heading>
      <Card padding={4} radius={3} border>
        <Stack gap={5}>
          {guideUrl && (
            <Stack gap={3}>
              <Text size={1} weight="semibold">
                Your editing guide
              </Text>
              <Text muted size={1}>
                Step-by-step help for the things you do most.
              </Text>
              <Flex>
                <Button
                  as="a"
                  href={guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  text="Open the guide (new tab)"
                  icon={LaunchIcon}
                  mode="ghost"
                />
              </Flex>
            </Stack>
          )}
          {supportEmail && (
            <Stack gap={3}>
              <Text size={1} weight="semibold">
                Ask Currawong
              </Text>
              <Text muted size={1}>
                Stuck, or not sure how to do something? Email us and we will help.
              </Text>
              <Flex align="center" gap={3} wrap="wrap">
                <Card padding={3} radius={2} tone="transparent" border>
                  <Text size={1} style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>
                    {supportEmail}
                  </Text>
                </Card>
                <Button
                  text="Copy email address"
                  icon={CopyIcon}
                  mode="ghost"
                  onClick={() => void copy()}
                />
              </Flex>
              <div role="status" aria-live="polite">
                {status === 'copied' && (
                  <Text size={1} muted>
                    Copied to your clipboard.
                  </Text>
                )}
                {status === 'failed' && (
                  <Text size={1} muted>
                    Could not copy. Select the address above and copy it.
                  </Text>
                )}
              </div>
            </Stack>
          )}
          {!guideUrl && !supportEmail && (
            <Text size={1} muted>
              Ask your Currawong contact where to find help.
            </Text>
          )}
        </Stack>
      </Card>
      {children}
    </Stack>
  )
})
