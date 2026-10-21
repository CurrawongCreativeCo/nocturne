import type { ComponentType, ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { type InputProps, ArrayOfObjectsFunctions } from 'sanity'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ roles: [{ name: 'editor' }] as { name: string }[] }))

vi.mock('sanity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCurrentUser: () => ({ roles: state.roles }),
  // Stands in for Sanity's own "Add item" menu: lists the types it was given.
  ArrayOfObjectsFunctions: ({ schemaType }: { schemaType: { of: { name: string }[] } }) => (
    <ul data-testid="insert-menu">
      {schemaType.of.map((type) => (
        <li key={type.name}>{type.name}</li>
      ))}
    </ul>
  ),
}))

import { createRoleAwareInput } from './section-insert-filter'

type FunctionsComponent = ComponentType<{ schemaType: unknown }>

const sectionTypes = ['richText', 'mediaText', 'faq', 'hero', 'pricing'].map((name) => ({
  name,
  jsonType: 'object',
}))
const RoleAwareInput = createRoleAwareInput(new Set(sectionTypes.map(({ name }) => name)))

/**
 * An array input as Sanity 6.19 passes it: `arrayFunctions` is undefined unless an override set it,
 * and the default input falls back to ArrayOfObjectsFunctions. Renders the insert menu and the
 * existing items (which are never filtered).
 */
function render(value: { _key: string; _type: string }[], arrayFunctions?: FunctionsComponent) {
  const schemaType = { name: 'sections', jsonType: 'array', of: sectionTypes }
  const props = {
    schemaType,
    value,
    arrayFunctions,
    renderDefault: (inner: { arrayFunctions?: FunctionsComponent }) => {
      const Functions = (inner.arrayFunctions ?? ArrayOfObjectsFunctions) as FunctionsComponent
      return (
        <div>
          <Functions schemaType={schemaType} />
          {value.map((item) => (
            <p key={item._key}>item:{item._type}</p>
          ))}
        </div>
      )
    },
  } as unknown as InputProps
  return renderToStaticMarkup(RoleAwareInput(props) as ReactElement)
}

const existing = [
  { _key: 'a', _type: 'hero' },
  { _key: 'b', _type: 'pricing' },
]

describe('SectionInsertFilter', () => {
  beforeEach(() => {
    state.roles = [{ name: 'editor' }]
  })

  it.each([
    ['empty', []],
    ['non-empty', existing],
  ])('shows a client only the allowed section types (%s page)', (_label, value) => {
    const html = render(value)
    expect(html).toContain('richText')
    expect(html).toContain('mediaText')
    expect(html).toContain('faq')
    expect(html).not.toContain('<li>hero</li>')
    expect(html).not.toContain('<li>pricing</li>')
  })

  it('keeps existing sections of any type for a client', () => {
    const html = render(existing)
    expect(html).toContain('item:hero')
    expect(html).toContain('item:pricing')
  })

  it('also filters when another override already set arrayFunctions', () => {
    const html = render([], ArrayOfObjectsFunctions as FunctionsComponent)
    expect(html).toContain('<li>richText</li>')
    expect(html).not.toContain('<li>hero</li>')
  })

  it.each([
    ['empty', []],
    ['non-empty', existing],
  ])('does not filter for agency staff (%s page)', (_label, value) => {
    state.roles = [{ name: 'administrator' }]
    const html = render(value)
    for (const { name } of sectionTypes) expect(html).toContain(`<li>${name}</li>`)
  })
})
