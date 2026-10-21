import { Button } from '@sanity/ui'
import { useEffect, useState } from 'react'
import {
  useCurrentUser,
  useValidationStatus,
  type DocumentActionComponent,
  type DocumentActionsResolver,
  type Path,
} from 'sanity'
import { useDocumentPane } from 'sanity/structure'

import { PublishValidationDialog } from '../components/publish-validation-dialog'
import { openValidationProblem, publishProblems } from '../utils/publish-validation'

export const PublishValidation: DocumentActionComponent = (props) => {
  const pane = useDocumentPane()
  const { onPathOpen, onFocus, openInspector } = pane
  const currentUser = useCurrentUser()
  // Match Sanity 6.19's Publish action, including release/variant document ids and reference rules.
  const { validation, isValidating } = useValidationStatus(
    pane.value._id,
    props.type,
    !props.release,
  )
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState<{ path: Path | null } | null>(null)
  const problems = publishProblems(pane.schemaType, validation, {
    document: pane.value,
    currentUser,
  })

  useEffect(() => {
    if (!destination) return
    // Wait until the modal has closed, so its focus restoration cannot steal field focus.
    const frame = requestAnimationFrame(() => {
      setDestination(null)
      openValidationProblem(destination.path, { onPathOpen, onFocus, openInspector })
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [destination, onPathOpen, onFocus, openInspector])

  if (!open && !problems.some((problem) => problem.level === 'error')) return null
  return {
    label: 'Why can’t I publish?',
    onHandle: () => {
      setDestination(null)
      setOpen(true)
    },
    dialog: open && {
      type: 'dialog',
      header: 'Before you publish',
      width: 'medium',
      onClose: () => {
        setOpen(false)
      },
      content: (
        <PublishValidationDialog
          problems={problems}
          isValidating={isValidating}
          onGoToField={(problem) => {
            setOpen(false)
            setDestination({ path: problem.target })
          }}
        />
      ),
      footer: (
        <Button
          text="Close"
          mode="bleed"
          onClick={() => {
            setOpen(false)
          }}
        />
      ),
    },
  }
}

/** Keep Publish and its validation tooltip intact; put help immediately after it in the actions. */
export const publishValidationActions: DocumentActionsResolver = (prev) =>
  prev.flatMap((action) => (action.action === 'publish' ? [action, PublishValidation] : [action]))
