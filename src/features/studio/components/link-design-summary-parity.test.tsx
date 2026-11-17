// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { cleanup, render } from '@testing-library/react'
import type { ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it } from 'vitest'

import { LinkDesignSummaryInput } from './link-design-summary-input'

/**
 * The Link list link's Appearance summary draws exactly what it drew before task 275 generalised it
 * into the shared design summary: these snapshots were captured from the earlier component, state by
 * state, and must not change. (Behaviour is also covered by link-design-summary-input.test.tsx.)
 */

const theme = buildTheme()
afterEach(cleanup)

const STATES: Record<string, Record<string, unknown> | undefined> = {
  'no design': undefined,
  'empty object': {},
  'customised, nothing chosen yet': { appearance: 'custom' },
  'customised, one change': { appearance: 'custom', border: 'thin' },
  'customised, many changes': {
    appearance: 'custom',
    border: 'thin',
    shadow: 'soft',
    arrowStyle: 'arrow',
    iconShape: 'circle',
    iconBorder: 'thin',
    label: { colour: { colour: 'accent' } },
  },
  'deliberate off values': {
    appearance: 'custom',
    border: 'none',
    shadow: 'flat',
    arrowStyle: 'none',
    background: { colour: 'transparent' },
  },
  'follows the list with saved choices': { border: 'thick', shadow: 'soft' },
  'follows the list with one saved choice': { label: { size: 'large' } },
}

function html(value: Record<string, unknown> | undefined, readOnly = false) {
  const { container } = render(
    <ThemeProvider theme={theme}>
      <LinkDesignSummaryInput
        {...({
          value,
          onChange: () => undefined,
          readOnly,
          renderDefault: () => <div>the fields</div>,
        } as unknown as ObjectInputProps)}
      />
    </ThemeProvider>,
  )
  const text = container.innerHTML
  cleanup()
  return text
}

describe('the Link list link summary', () => {
  it.each(Object.entries(STATES))('draws %s as before', (_name, value) => {
    expect(html(value)).toMatchSnapshot()
  })

  it('draws the read-only state as before', () => {
    expect(html({ appearance: 'custom', border: 'thin' }, true)).toMatchSnapshot()
  })
})
