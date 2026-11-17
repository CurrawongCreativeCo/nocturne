// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, render, screen } from '@testing-library/react'
import { FormValueProvider, type ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PORTRAIT_NOTICE } from '@/lib/sanity/team-portrait'

import { FrameReferenceInput } from './frame-reference-input'

const theme = buildTheme()
afterEach(cleanup)

/** The Image design input of the Team section at `pageBuilder[0]`, inside a page holding `section`. */
function draw(section: Record<string, unknown>, type = 'team') {
  const props = {
    value: section.imageDesign,
    path: ['pageBuilder', { _key: 'a' }, 'imageDesign'],
    onChange: vi.fn(),
    readOnly: false,
    schemaType: { name: 'imageDesign' },
    renderDefault: () => <div data-testid="image-design-fields">Image shape</div>,
  } as unknown as ObjectInputProps
  render(
    <ThemeProvider theme={theme}>
      <FormValueProvider
        value={{
          _id: 'page',
          _type: 'page',
          pageBuilder: [{ _key: 'a', _type: type, ...section }],
        }}
      >
        <FrameReferenceInput {...props} />
      </FormValueProvider>
    </ThemeProvider>,
  )
}

describe('the Image design input on a Team section', () => {
  it('explains how to reach Portrait, beside Image shape, on a List that keeps its design', () => {
    draw({ variant: 'list', imageDesign: { appearance: 'circle', motion: 'subtle' } })
    const note = screen.getByRole('note')
    expect(note.textContent).toBe(PORTRAIT_NOTICE)
    expect(screen.getByTestId('image-design-fields')).toBeTruthy()
    // The note comes first, so a reader meets it before the control it explains.
    expect(
      note.compareDocumentPosition(screen.getByTestId('image-design-fields')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('stays out of the way on Grid, Slider and a List with nothing effective', () => {
    for (const section of [
      { variant: 'grid', imageDesign: { appearance: 'circle' } },
      { variant: 'slider', imageDesign: { appearance: 'circle' } },
      { variant: 'list', imageDesign: { appearance: 'standard', motion: 'none', custom: false } },
      { variant: 'list', imageDesign: { custom: false } },
    ]) {
      cleanup()
      draw(section)
      expect(screen.queryByRole('note')).toBeNull()
      expect(screen.getByTestId('image-design-fields')).toBeTruthy()
    }
  })

  it('never shows on another section’s Image design', () => {
    draw({ variant: 'list', imageDesign: { appearance: 'circle' } }, 'mediaText')
    expect(screen.queryByRole('note')).toBeNull()
  })
})
