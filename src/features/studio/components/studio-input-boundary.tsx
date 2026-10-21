import { Button, Card, Flex, Stack, Text } from '@sanity/ui'
import { Component, type ReactNode } from 'react'
import { useCurrentUser } from 'sanity'

import { siteProfile } from '@/config/profile'
import { isClientView } from '@/lib/sanity/roles'

/** Where a client is sent for help: the profile's support email, else the editing guide. */
export function supportRoute(help = siteProfile.help): { href: string; label: string } | null {
  if (help.supportEmail) return { href: `mailto:${help.supportEmail}`, label: 'Email support' }
  if (help.guideUrl) return { href: help.guideUrl, label: 'Open the editing guide' }
  return null
}

export function InputErrorFallback({ onRetry }: { onRetry: () => void }) {
  const support = supportRoute()
  return (
    <Card padding={4} radius={2} border tone="caution" role="alert">
      <Stack gap={3}>
        <Text weight="semibold">This part of the page couldn&apos;t be shown.</Text>
        <Text size={1}>Your content is safe.</Text>
        <Flex gap={3} align="center">
          <Button text="Try again" mode="ghost" onClick={onRetry} />
          {support && (
            <Text size={1}>
              <a href={support.href}>{support.label}</a>
            </Text>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}

interface BoundaryProps {
  /** Clients get the friendly fallback; agency staff keep Sanity's own error, which names the cause. */
  client: boolean
  children: ReactNode
}

interface BoundaryState {
  error: Error | null
}

export class InputErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  retry = () => {
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (!this.props.client) throw error
    return <InputErrorFallback onRetry={this.retry} />
  }
}

/**
 * Wraps the project's own input overrides (StudioInput in sanity.config.ts) so a bug in one can
 * never put a raw React error, with its "Unset value" button, in front of a client.
 */
export function StudioInputBoundary({ children }: { children: ReactNode }) {
  const client = isClientView(useCurrentUser())
  return <InputErrorBoundary client={client}>{children}</InputErrorBoundary>
}
