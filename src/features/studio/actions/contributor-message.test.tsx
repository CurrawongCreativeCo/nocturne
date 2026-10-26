import { renderToStaticMarkup } from 'react-dom/server'
import type { DocumentActionDescription, DocumentActionProps } from 'sanity'
import { describe, expect, it } from 'vitest'

import { SentToCurrawong, contributorMessageActions } from './contributor-message'
import { CONTRIBUTOR_MESSAGE } from '../utils/document-access'

const Publish = Object.assign(() => ({ label: 'Publish' }), { action: 'publish' as const })
const Discard = Object.assign(() => ({ label: 'Discard' }), { action: 'discardChanges' as const })
const user = (role: string) => ({ currentUser: { roles: [{ name: role }] } }) as never

function describeAction() {
  let result: DocumentActionDescription | null | undefined
  function Probe() {
    result = SentToCurrawong({} as DocumentActionProps)
    return null
  }
  renderToStaticMarkup(<Probe />)
  return result
}

describe('contributorMessageActions', () => {
  it('replaces Publish with the message for a contributor', () => {
    expect(contributorMessageActions([Publish, Discard], user('contributor'))).toEqual([
      SentToCurrawong,
      Discard,
    ])
  })

  it('leaves agency staff and editors with Publish', () => {
    expect(contributorMessageActions([Publish, Discard], user('administrator'))).toEqual([
      Publish,
      Discard,
    ])
    expect(contributorMessageActions([Publish, Discard], user('editor'))).toEqual([
      Publish,
      Discard,
    ])
  })
})

describe('SentToCurrawong', () => {
  it('says where the changes go, in its tooltip', () => {
    const result = describeAction()
    expect(result?.label).toBe('Sent to Currawong')
    expect(result?.title).toBe(CONTRIBUTOR_MESSAGE)
  })
})
