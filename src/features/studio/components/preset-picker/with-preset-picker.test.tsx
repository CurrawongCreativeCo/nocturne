// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, render, screen } from '@testing-library/react'
import type { InputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defaultSummaryWording, type DesignSummaryConfig } from '@/lib/sanity/design-summary'
import { LINK_DESIGN_SUMMARY } from '@/lib/sanity/link-design-summary'

import { withPresetPicker } from './with-preset-picker'

// The Studio's inputs reach the Sanity project's settings, which a unit test has no .env for.
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

const theme = buildTheme()
afterEach(cleanup)

const CARDS: DesignSummaryConfig = {
  scope: 'card',
  groups: [{ id: 'cards', title: 'Cards' }],
  properties: [{ group: 'cards', key: 'border', label: 'border' }],
  ...defaultSummaryWording('card', 'the site design'),
}

const Input = withPresetPicker(() => <div>the role-aware input</div>)

function draw(options: Record<string, unknown> | undefined, value?: Record<string, unknown>) {
  render(
    <ThemeProvider theme={theme}>
      <Input
        {...({
          path: ['pageBuilder', 'cardDesign'],
          value,
          readOnly: false,
          onChange: () => undefined,
          renderDefault: () => <div>the fields</div>,
          schemaType: { jsonType: 'object', name: 'cardDesign', options },
        } as unknown as InputProps)}
      />
    </ThemeProvider>,
  )
}

describe('withPresetPicker and options.designSummary', () => {
  it('gives any design object that sets one the summary and resets, with its own words', () => {
    draw({ designSummary: CARDS }, { border: 'none' })
    expect(screen.getByText('Customised · 1 change')).toBeTruthy()
    expect(screen.getByText(/all cards in this section/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset all' })).toBeTruthy()
    expect(screen.getByText('the fields')).toBeTruthy()
  })

  it('gives a Link list link’s Appearance the Link list’s words', () => {
    draw({ designSummary: LINK_DESIGN_SUMMARY }, { appearance: 'custom', border: 'thin' })
    expect(screen.getByText(/This link only/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset this link' })).toBeTruthy()
  })

  it('leaves an object that sets none to the ordinary input', () => {
    draw(undefined)
    expect(screen.getByText('the role-aware input')).toBeTruthy()
    expect(screen.queryByTestId('design-summary')).toBeNull()
  })
})
