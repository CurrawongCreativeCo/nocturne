import { Card, Text } from '@sanity/ui'
import { type ComponentType } from 'react'
import { type InputProps, useCurrentUser } from 'sanity'

import { isClientView } from '@/lib/sanity/roles'

import { DIVIDER_CLIENT_NOTE } from '../utils/rich-text-divider'

/**
 * A divider's own fields are agency only, so a client who opens one (double-click, or Edit in its menu)
 * would otherwise get a blank dialog. They see this instead (task 151); agency staff get the usual input,
 * which `Fallback` renders. Applied to the shared `decorativeDivider` type in sanity.config.ts, where the
 * other inputs are composed, so no schema file imports it.
 */
export function createDividerClientNote(Fallback: ComponentType<InputProps>) {
  return function DividerClientNote(props: InputProps) {
    const user = useCurrentUser()
    if (!isClientView(user)) return <Fallback {...props} />
    return (
      <Card padding={3} radius={2} tone="transparent" border data-testid="divider-client-note">
        <Text size={1} muted>
          {DIVIDER_CLIENT_NOTE}
        </Text>
      </Card>
    )
  }
}
