import { describe, expect, it } from 'vitest'

import { lengthMessage, lengthWarning } from './length-guidance'

describe('lengthWarning', () => {
  it('applies max as a warning with a plain message', () => {
    const calls: string[] = []
    const rule = {
      max: (n: number) => (calls.push(`max ${n}`), rule),
      warning: (m?: string) => (calls.push(`warning ${m}`), rule),
    }
    lengthWarning(rule, 70, 'Headings')
    expect(calls).toEqual(['max 70', `warning ${lengthMessage('Headings', 70)}`])
  })
})
