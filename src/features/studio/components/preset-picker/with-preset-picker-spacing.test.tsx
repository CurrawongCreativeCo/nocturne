// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { InputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { withPresetPicker } from './with-preset-picker'

vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
// The note fetches from the Studio client; routing is what is under test here.
vi.mock('../spacing-usage-note', () => ({
  SpacingUsageInput: (props: { renderDefault: (props: unknown) => unknown }) => (
    <div>
      <p>the spacing note</p>
      {props.renderDefault(props) as never}
    </div>
  ),
}))

afterEach(cleanup)

const Input = withPresetPicker(() => <div>the role-aware input</div>)

function draw(path: string[], options: Record<string, unknown> | undefined) {
  render(
    <Input
      {...({
        path,
        readOnly: false,
        onChange: () => undefined,
        renderDefault: () => <div>the fields</div>,
        schemaType: { jsonType: 'object', name: 'designSettings', options },
      } as unknown as InputProps)}
    />,
  )
}

describe('withPresetPicker and options.spacingUsage', () => {
  it('puts the spacing note above the form of a document that asks for it', () => {
    draw([], { spacingUsage: true })
    expect(screen.getByText('the spacing note')).toBeTruthy()
    expect(screen.getByText('the fields')).toBeTruthy()
  })

  it('shows it only at the root of the document, not on a nested object', () => {
    draw(['nested'], { spacingUsage: true })
    expect(screen.queryByText('the spacing note')).toBeNull()
  })

  it('leaves any other document to the ordinary input', () => {
    draw([], undefined)
    expect(screen.queryByText('the spacing note')).toBeNull()
    expect(screen.getByText('the role-aware input')).toBeTruthy()
  })
})
