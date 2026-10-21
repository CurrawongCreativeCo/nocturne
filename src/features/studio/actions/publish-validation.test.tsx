import { Schema } from '@sanity/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  type DocumentActionDescription,
  type DocumentActionProps,
  type DocumentActionsContext,
  type ObjectSchemaType,
  type ValidationMarker,
  useValidationStatus,
} from 'sanity'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PublishValidation, publishValidationActions } from './publish-validation'
import { filterDocumentActions } from '../utils/document-access'

const state = vi.hoisted(() => ({ validation: [] as ValidationMarker[], id: 'drafts.test' }))
vi.mock('sanity', () => ({
  useCurrentUser: () => null,
  useValidationStatus: vi.fn(() => ({ validation: state.validation, isValidating: false })),
}))
const schema = Schema.compile({
  types: [
    { name: 'page', type: 'document', fields: [{ name: 'title', title: 'Title', type: 'string' }] },
  ],
}).get('page') as ObjectSchemaType
vi.mock('sanity/structure', () => ({
  useDocumentPane: () => ({
    schemaType: schema,
    value: { _id: state.id, _type: 'page' },
    onPathOpen: vi.fn(),
    onFocus: vi.fn(),
    openInspector: vi.fn(),
  }),
}))

function action(release?: string) {
  let result: DocumentActionDescription | null | undefined
  function Probe() {
    result = PublishValidation({ id: 'test', type: 'page', release } as DocumentActionProps)
    return null
  }
  renderToStaticMarkup(<Probe />)
  return result
}

beforeEach(() => {
  state.validation = []
  state.id = 'drafts.test'
  vi.clearAllMocks()
})

describe('publishValidationActions', () => {
  it('adds help after Publish, retaining the original action and other actions', () => {
    const Publish = Object.assign(() => ({ label: 'Publish', disabled: true }), {
      action: 'publish' as const,
    })
    const Delete = Object.assign(() => ({ label: 'Delete' }), { action: 'delete' as const })
    const result = publishValidationActions([Publish, Delete], {} as DocumentActionsContext)
    expect(result).toEqual([Publish, PublishValidation, Delete])
    expect(result[0]?.({} as DocumentActionProps)?.disabled).toBe(true)
    expect(publishValidationActions([Delete], {} as DocumentActionsContext)).toEqual([Delete])
    expect(filterDocumentActions(result, 'editor', true)).toContain(PublishValidation)
  })
  it('shows help only for errors; warnings never block publishing', () => {
    expect(action()).toBeNull()
    state.validation = [{ level: 'warning', message: 'Try a shorter heading.', path: ['title'] }]
    expect(action()).toBeNull()
    state.validation.push({ level: 'error', message: 'Required', path: ['title'] })
    expect(action()).toMatchObject({ label: 'Why can’t I publish?', dialog: false })
  })
  it('uses the same validation target and reference rules as Publish, including release versions', () => {
    action()
    expect(useValidationStatus).toHaveBeenLastCalledWith('drafts.test', 'page', true)
    state.id = 'versions.release.test'
    action('release')
    expect(useValidationStatus).toHaveBeenLastCalledWith('versions.release.test', 'page', false)
  })
})
