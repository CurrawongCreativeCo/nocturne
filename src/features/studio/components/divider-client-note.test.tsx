// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, render, screen } from '@testing-library/react'
import type { InputProps } from 'sanity'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeClientViewPreview } from '@/lib/sanity/roles'

import { createDividerClientNote } from './divider-client-note'
import { DIVIDER_CLIENT_NOTE } from '../utils/rich-text-divider'

const state = vi.hoisted(() => ({
  user: { roles: [{ name: 'administrator' }] },
}))
vi.mock('sanity', () => ({ useCurrentUser: () => state.user }))

/**
 * A client who opens a divider (its own fields are agency only) is told so, not shown a blank dialog; agency
 * staff get the usual input. Rendered with the Studio's theme, as the dialog would be.
 */
const theme = buildTheme()
const Note = createDividerClientNote(() => <div data-testid="usual-input" />)
const renderNote = () =>
  render(
    <ThemeProvider theme={theme}>
      <Note {...({} as InputProps)} />
    </ThemeProvider>,
  )

beforeEach(() => {
  state.user = { roles: [{ name: 'administrator' }] }
  writeClientViewPreview(false)
})
afterEach(() => {
  cleanup()
  writeClientViewPreview(false)
})

describe('the divider’s note for clients', () => {
  it('is not shown to agency staff, who get the usual input', () => {
    renderNote()
    expect(screen.getByTestId('usual-input')).toBeTruthy()
    expect(screen.queryByText(DIVIDER_CLIENT_NOTE)).toBeNull()
  })

  it('replaces the blank dialog for a client with a short explanation', () => {
    state.user = { roles: [{ name: 'editor' }] }
    renderNote()
    expect(screen.getByText(DIVIDER_CLIENT_NOTE)).toBeTruthy()
    expect(screen.queryByTestId('usual-input')).toBeNull()
  })

  it('is shown to agency staff previewing the client view', () => {
    writeClientViewPreview(true)
    renderNote()
    expect(screen.getByText(DIVIDER_CLIENT_NOTE)).toBeTruthy()
  })

  it('says what a client can and cannot do, in Australian English', () => {
    expect(DIVIDER_CLIENT_NOTE).toMatch(/move it or delete it, but not change it/)
  })
})
