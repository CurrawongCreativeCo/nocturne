/**
 * Where a Contributor's Publish button would be: a message that their changes go to Currawong.
 * Sanity refuses Publish for the role, so the button is gone; this says why and what happens next.
 */
import { Button, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import type { DocumentActionComponent, DocumentActionsResolver } from 'sanity'

import { currentAudience } from '../roles'
import { CONTRIBUTOR_MESSAGE, replacePublishForContributor } from '../utils/document-access'

export const SentToCurrawong: DocumentActionComponent = () => {
  const [open, setOpen] = useState(false)
  return {
    label: 'Sent to Currawong',
    title: CONTRIBUTOR_MESSAGE,
    onHandle: () => {
      setOpen(true)
    },
    dialog: open && {
      type: 'dialog',
      header: 'Your changes go to Currawong',
      width: 'small',
      onClose: () => {
        setOpen(false)
      },
      content: (
        <Stack gap={3}>
          <Text>{CONTRIBUTOR_MESSAGE}</Text>
          <Text size={1} muted>
            Keep editing as often as you like. Nothing goes live until Currawong has reviewed it.
          </Text>
        </Stack>
      ),
      footer: (
        <Stack padding={3}>
          <Button
            text="Got it"
            tone="primary"
            onClick={() => {
              setOpen(false)
            }}
          />
        </Stack>
      ),
    },
  }
}
SentToCurrawong.displayName = 'SentToCurrawongAction'

/** Contributors see the message in place of Publish; other roles are untouched. */
export const contributorMessageActions: DocumentActionsResolver = (prev, { currentUser }) =>
  replacePublishForContributor(prev, currentAudience(currentUser), SentToCurrawong)
