import { Button, ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PublishValidationDialog } from './publish-validation-dialog'
import type { PublishProblem } from '../utils/publish-validation'

const error: PublishProblem = {
  title: 'Sections › Hero › Design › Approved frame',
  message: 'Choose an approved frame, or a different frame style',
  level: 'error',
  path: ['sections', { _key: 'internal-key' }],
  target: ['sections'],
  hidden:
    'This setting is hidden by another choice (Appearance: Circle). Change Appearance to Framed to show it, or ask your agency for help.',
}
const warning: PublishProblem = {
  ...error,
  title: 'Heading',
  level: 'warning',
  message: 'Try a shorter heading.',
  hidden: undefined,
}
const render = (problems: PublishProblem[], isValidating = false) =>
  renderToStaticMarkup(
    <ThemeProvider theme={buildTheme()}>
      <PublishValidationDialog
        problems={problems}
        isValidating={isValidating}
        onGoToField={vi.fn()}
      />
    </ThemeProvider>,
  )

function buttons(node: ReactNode): ReactElement<{ onClick: () => void }>[] {
  if (Array.isArray(node)) return node.flatMap(buttons)
  if (!isValidElement<{ children?: ReactNode }>(node)) return []
  return node.type === Button
    ? [node as ReactElement<{ onClick: () => void }>]
    : buttons(node.props.children)
}

describe('PublishValidationDialog', () => {
  it('lists field titles, messages, hidden-setting recovery and separately labelled warnings', () => {
    const html = render([warning, error])
    expect(html).toContain('Fix these errors before publishing.')
    expect(html.indexOf('Errors')).toBeLessThan(html.indexOf('Warnings'))
    expect(html).toContain('These are suggestions. You can still publish.')
    expect(html).toContain(error.title)
    expect(html).toContain(error.message)
    expect(html).toContain('Appearance: Circle')
    expect(html).toContain('Change Appearance to Framed')
    expect(html).toContain(`aria-label="Go to field: ${error.title}"`)
    expect(html).not.toContain('internal-key')
    expect(html).not.toContain('_key')
    expect(html.match(/<li /g)).toHaveLength(2)
  })
  it('sends the selected problem to navigation, keeping errors and warnings in their own order', () => {
    const onGoToField = vi.fn()
    const tree = PublishValidationDialog({
      problems: [warning, error],
      isValidating: false,
      onGoToField,
    })
    const actions = buttons(tree)
    expect(actions).toHaveLength(2)
    actions[0]?.props.onClick()
    expect(onGoToField).toHaveBeenLastCalledWith(error)
    actions[1]?.props.onClick()
    expect(onGoToField).toHaveBeenLastCalledWith(warning)
  })
  it('shows the latest validation state and stays useful when all errors have been fixed', () => {
    expect(render([error], true)).toContain('role="status"')
    const html = render([warning])
    expect(html).toContain('There are no errors blocking publishing.')
    expect(html).not.toContain('Fix these errors')
    expect(render([])).not.toContain('Go to field')
  })
})
