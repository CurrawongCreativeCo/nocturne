// @vitest-environment jsdom
import { defineSchema, EditorProvider, useEditor, type Editor } from '@portabletext/editor'
import { BehaviorPlugin, EventListenerPlugin } from '@portabletext/editor/plugins'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { dividerGuardBehaviors } from './rich-text-divider-behaviors'
import { createMoveRecord } from '../utils/rich-text-divider'

/**
 * The divider guard against the real Portable Text editor (the one Sanity's Studio runs), headless: what a
 * client can and cannot do to a divider in a Rich text body. The events are the ones the Studio sends:
 * the toolbar's insert is `insert.block`, a paste is `insert.blocks`, a cut is `clipboard.cut`, and a drag
 * and drop is `drag.dragstart`, a delete, an insert of the same block and `drag.dragend`. Verified by hand
 * in the real Studio on 11 November 2026 (Nocturne QA); this is what keeps those results from regressing.
 */

const text = (words: string, key: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text: words, marks: [] }],
})
const rule = { _type: 'decorativeDivider', _key: 'd1', style: 'line', width: 'short' }
const INITIAL = [text('One', 'a'), rule, text('Two', 'b')]
const schemaDefinition = defineSchema({
  styles: [{ name: 'normal' }],
  blockObjects: [{ name: 'decorativeDivider' }],
})

let root: Root | undefined
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
})

interface Harness {
  editor: Editor
  /** The body as short labels: p:words, or the divider's key and style. */
  body: () => string[]
  blocked: () => number
  send: (event: Record<string, unknown>) => Promise<void>
}

async function mount({ guarded }: { guarded: boolean }): Promise<Harness> {
  const held: { editor?: Editor; ready: boolean } = { ready: false }
  let blocked = 0
  const Grab = () => {
    const found = useEditor()
    useEffect(() => {
      held.editor = found
    }, [found])
    return null
  }
  const element = document.createElement('div')
  document.body.appendChild(element)
  root = createRoot(element)
  const behaviors = dividerGuardBehaviors({
    moves: createMoveRecord(),
    onBlocked: () => {
      blocked += 1
    },
  })
  await act(async () => {
    root?.render(
      createElement(
        EditorProvider,
        { initialConfig: { schemaDefinition, initialValue: INITIAL } },
        createElement(Grab),
        createElement(EventListenerPlugin, {
          on: (event: { type: string }) => {
            if (event.type === 'ready') held.ready = true
          },
        }),
        guarded ? createElement(BehaviorPlugin, { behaviors }) : null,
      ),
    )
    await Promise.resolve()
  })
  for (let tries = 0; tries < 50 && !held.ready; tries += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  const live = held.editor
  if (!live || !held.ready) throw new Error('The editor did not become ready.')
  return {
    editor: live,
    body: () =>
      live.getSnapshot().context.value.map((block) => {
        const entry = block as {
          _type: string
          _key: string
          style?: string
          children?: { text: string }[]
        }
        return entry._type === 'block'
          ? `p:${entry.children?.map((child) => child.text).join('') ?? ''}`
          : `${entry._key}:${entry.style ?? '-'}`
      }),
    blocked: () => blocked,
    send: async (event) => {
      await act(async () => {
        live.send(event as never)
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    },
  }
}

/** The dividers in the body, whatever key a pasted copy was given. */
const dividers = (page: Harness) => page.body().filter((entry) => !entry.startsWith('p:'))

const insertDivider = (block: Record<string, unknown>) => ({
  type: 'insert.block',
  block,
  placement: 'after',
  select: 'end',
})
const paste = (blocks: Record<string, unknown>[]) => ({
  type: 'insert.blocks',
  blocks,
  placement: 'auto',
})

describe('a client (the guard is on)', () => {
  it('starts with the stored divider valid and present', async () => {
    const page = await mount({ guarded: true })
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two'])
    expect(page.blocked()).toBe(0)
  })

  it('cannot insert a divider (the toolbar’s insert), and is told why', async () => {
    const page = await mount({ guarded: true })
    await page.send(insertDivider({ _type: 'decorativeDivider', _key: 'new1', style: 'dots' }))
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two'])
    expect(page.blocked()).toBe(1)
  })

  it('can still insert an ordinary block', async () => {
    const page = await mount({ guarded: true })
    await page.send(insertDivider(text('Three', 'c')))
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two', 'p:Three'])
    expect(page.blocked()).toBe(0)
  })

  it('cannot paste a divider: the text around it is pasted, the divider is not', async () => {
    const page = await mount({ guarded: true })
    await page.send(paste([text('Pasted', 'p1'), { ...rule, _key: 'copy1' }]))
    expect(page.body().some((entry) => entry.startsWith('copy1'))).toBe(false)
    expect(page.body()).toContain('p:Pasted')
    expect(page.blocked()).toBe(1)
  })

  it('cannot paste only a divider', async () => {
    const page = await mount({ guarded: true })
    await page.send(paste([{ ...rule, _key: 'copy1' }]))
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two'])
    expect(page.blocked()).toBe(1)
  })

  it('cannot paste an exact copy of an existing divider either: with no drag in progress it is new', async () => {
    const page = await mount({ guarded: true })
    await page.send(paste([{ ...rule }]))
    expect(dividers(page)).toHaveLength(1)
    expect(page.blocked()).toBe(1)
  })

  it('cannot cut a divider away, so a cut and a blocked paste can never lose it', async () => {
    const page = await mount({ guarded: true })
    await page.send({
      type: 'select',
      at: {
        anchor: { path: [{ _key: 'd1' }], offset: 0 },
        focus: { path: [{ _key: 'd1' }], offset: 0 },
      },
    })
    await page.send({ type: 'clipboard.cut', originEvent: { clipboardData: null } })
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two'])
    expect(page.blocked()).toBe(1)
  })

  it('can delete a divider', async () => {
    const page = await mount({ guarded: true })
    await page.send({ type: 'delete.block', at: [{ _key: 'd1' }] })
    expect(page.body()).toEqual(['p:One', 'p:Two'])
    expect(page.blocked()).toBe(0)
  })

  it('can undo deleting a divider: undo restores it without an insert event', async () => {
    const page = await mount({ guarded: true })
    await page.send({ type: 'delete.block', at: [{ _key: 'd1' }] })
    await page.send({ type: 'history.undo' })
    expect(page.body()).toEqual(['p:One', 'd1:line', 'p:Two'])
    expect(page.blocked()).toBe(0)
  })

  describe('moving a divider by drag and drop', () => {
    // What a real drop does: the block is removed, then inserted again with its own key.
    const drop = async (page: Harness, block: Record<string, unknown>) => {
      await page.send({ type: 'drag.dragstart', originEvent: {} })
      await page.send({ type: 'delete.block', at: [{ _key: 'd1' }] })
      await page.send({ type: 'insert.blocks', blocks: [block], placement: 'after', select: 'end' })
    }

    it('keeps the divider: the same block, with its key and content, may be put back', async () => {
      const page = await mount({ guarded: true })
      await drop(page, { ...rule })
      await page.send({ type: 'drag.dragend', originEvent: {} })
      expect(dividers(page)).toHaveLength(1)
      expect(page.blocked()).toBe(0)
    })

    it('does not let a different divider through: a changed key or content is a new one', async () => {
      const changed = await mount({ guarded: true })
      await drop(changed, { ...rule, style: 'dots' })
      expect(changed.body().some((entry) => entry.startsWith('d1:dots'))).toBe(false)
      expect(changed.blocked()).toBe(1)
      const rekeyed = await mount({ guarded: true })
      await drop(rekeyed, { ...rule, _key: 'other' })
      expect(rekeyed.body().some((entry) => entry.startsWith('other'))).toBe(false)
    })

    it('gives a later paste no allowance once the drag has ended', async () => {
      const page = await mount({ guarded: true })
      await drop(page, { ...rule })
      await page.send({ type: 'drag.dragend', originEvent: {} })
      await page.send(paste([{ ...rule }]))
      expect(dividers(page)).toHaveLength(1)
      expect(page.blocked()).toBe(1)
    })

    it('gives a paste no allowance even if the drag’s end was missed', async () => {
      const page = await mount({ guarded: true })
      await page.send({ type: 'drag.dragstart', originEvent: {} })
      await page.send({ type: 'clipboard.paste', originEvent: { clipboardData: null } })
      await page.send(paste([{ ...rule, _key: 'copy1' }]))
      await page.send(paste([{ ...rule }]))
      expect(dividers(page)).toHaveLength(1)
      expect(page.blocked()).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('agency staff (no guard)', () => {
  it('can insert a divider and paste one', async () => {
    const page = await mount({ guarded: false })
    await page.send(insertDivider({ _type: 'decorativeDivider', _key: 'new1', style: 'dots' }))
    await page.send(paste([{ ...rule, _key: 'copy1' }]))
    // (This headless schema declares no fields, so only the keys are compared.)
    expect(page.body().some((entry) => entry.startsWith('new1'))).toBe(true)
    expect(page.body().some((entry) => entry.startsWith('copy1'))).toBe(true)
    expect(page.blocked()).toBe(0)
  })
})
