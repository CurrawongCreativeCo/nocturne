import { BehaviorPlugin } from '@portabletext/editor/plugins'
import { useToast } from '@sanity/ui/toast'
import { useMemo, useState } from 'react'
import { useCurrentUser, type PortableTextPluginsProps } from 'sanity'

import { currentAudience } from '@/lib/sanity/roles'

import { dividerGuardBehaviors } from './rich-text-divider-behaviors'
import {
  createMoveRecord,
  DIVIDER_BLOCKED_DESCRIPTION,
  DIVIDER_BLOCKED_TITLE,
} from '../utils/rich-text-divider'

/**
 * Mounted through the Rich text body's `components.portableText.plugins` (`withRichTextDividerGuard`). For
 * anyone but agency staff, including agency staff previewing the client view, it adds the divider guard and
 * says why when it refuses; agency staff get the editor as it is. The audience is read on each render, and
 * the Studio's client-view switch reloads the page, so a change of view always remounts this.
 */
export function RichTextDividerPlugins(props: PortableTextPluginsProps) {
  const user = useCurrentUser()
  const toast = useToast()
  const audience = currentAudience(user)
  // Dividers as they were when a drag began (see `createMoveRecord`); one record for this editor's life.
  const [moves] = useState(createMoveRecord)
  const behaviors = useMemo(
    () =>
      audience === 'agency'
        ? []
        : dividerGuardBehaviors({
            moves,
            onBlocked: () => {
              toast.push({
                status: 'info',
                title: DIVIDER_BLOCKED_TITLE,
                description: DIVIDER_BLOCKED_DESCRIPTION,
              })
            },
          }),
    [audience, moves, toast],
  )

  return (
    <>
      {behaviors.length > 0 && <BehaviorPlugin behaviors={behaviors} />}
      {props.renderDefault(props)}
    </>
  )
}
