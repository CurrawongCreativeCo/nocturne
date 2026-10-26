import { renderToStaticMarkup } from 'react-dom/server'
import type { DocumentActionDescription, DocumentActionProps } from 'sanity'
import { describe, expect, it } from 'vitest'

import { SentToCurrawong } from './contributor-message'
import { CONTRIBUTOR_MESSAGE } from '../utils/document-access'

function describeAction() {
  let result: DocumentActionDescription | null | undefined
  function Probe() {
    result = SentToCurrawong({} as DocumentActionProps)
    return null
  }
  renderToStaticMarkup(<Probe />)
  return result
}

describe('SentToCurrawong', () => {
  it('says where the changes go, in its tooltip', () => {
    const result = describeAction()
    expect(result?.label).toBe('Sent to Currawong')
    expect(result?.title).toBe(CONTRIBUTOR_MESSAGE)
  })
})
