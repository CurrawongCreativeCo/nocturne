import type { DocumentActionComponent, DocumentActionsContext } from 'sanity'
import { describe, expect, it } from 'vitest'

import { hideEnquiriesFromNewMenu, withoutEnquiryDuplicate } from './studio'

const action = (name: string) =>
  Object.assign(() => null, { action: name }) as DocumentActionComponent
const actions = ['publish', 'duplicate', 'delete'].map(action)
const context = (schemaType: string) => ({ schemaType }) as DocumentActionsContext

describe('withoutEnquiryDuplicate', () => {
  it('removes Duplicate from enquiries and keeps Delete', () => {
    const kept = withoutEnquiryDuplicate(actions, context('enquiry')).map((a) => a.action)
    expect(kept).toEqual(['publish', 'delete'])
  })

  it('leaves other documents alone', () => {
    expect(withoutEnquiryDuplicate(actions, context('form'))).toHaveLength(3)
  })
})

describe('hideEnquiriesFromNewMenu', () => {
  it('drops the enquiry template, whatever the creation context', () => {
    const options = [{ templateId: 'form' }, { templateId: 'enquiry' }] as never[]
    const result = hideEnquiriesFromNewMenu(options, {
      creationContext: { type: 'structure' },
    } as never)
    expect(result.map((o: { templateId: string }) => o.templateId)).toEqual(['form'])
  })
})
