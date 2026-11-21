// @vitest-environment jsdom
import { ThemeProvider } from '@sanity/ui'
import { buildTheme } from '@sanity/ui/theme'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { FormPatch, ObjectInputProps } from 'sanity'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { startingEdge, type EdgeValue } from '@/lib/sanity/composed-edge-editor'

import { SectionEdgeInput } from './section-edge-input'

/** The upload the test finishes by hand: until `finish` runs, it is pending. */
const pending: { finish: (id: string) => void; all: ((id: string) => void)[] } = {
  finish: () => undefined,
  all: [],
}
// One client for the whole file, as Studio's useClient gives: a new object per render would re-run the design
// bar's load effect on every render, which never settles.
const client = {
  fetch: () => Promise.resolve([]),
  assets: {
    upload: () =>
      new Promise<{ _id: string }>((resolve) => {
        const finish = (id: string) => {
          resolve({ _id: id })
        }
        pending.finish = finish
        pending.all.push(finish)
      }),
  },
}
vi.mock('sanity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useClient: () => client,
  useFormValue: () => undefined,
}))

Element.prototype.scrollIntoView = vi.fn()
const theme = buildTheme()
afterEach(() => {
  cleanup()
  pending.all = []
})

const REF = 'image-0123456789abcdef0123456789abcdef01234567-640x480-png'

function Harness({ initial, onValue }: { initial: unknown; onValue: (v: unknown) => void }) {
  const [value, setValue] = useState<unknown>(initial)
  return (
    <ThemeProvider theme={theme}>
      <SectionEdgeInput
        {...({
          value,
          readOnly: false,
          members: [],
          renderInput: () => null,
          renderField: () => null,
          renderItem: () => null,
          renderPreview: () => null,
          onChange: (event: FormPatch) => {
            const next =
              event.type === 'unset' ? undefined : (event as unknown as { value: unknown }).value
            setValue(next)
            onValue(next)
          },
        } as unknown as ObjectInputProps)}
      />
    </ThemeProvider>
  )
}

const withPicture = (): EdgeValue => ({ ...startingEdge(), centre: { kind: 'image', gap: 20 } })

/** Mount with the Picture centre chosen, start an upload, and leave it pending. */
function startUpload(initial: unknown = withPicture()) {
  const seen: (EdgeValue | undefined)[] = []
  render(<Harness initial={initial} onValue={(v) => seen.push(v as EdgeValue | undefined)} />)
  const input = document.querySelector<HTMLInputElement>('input[type=file]')
  if (!input) throw new Error('no picture control')
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'centre.png', { type: 'image/png' })] },
  })
  return seen
}
const finish = async () => {
  pending.finish(REF)
  // Let the upload's continuation run (it is a few promise turns), inside act so React applies the update.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}
const last = (seen: (EdgeValue | undefined)[]) => seen.at(-1)
const refOf = (value: EdgeValue | undefined) =>
  (value?.centre?.image as { asset?: { _ref?: string } } | undefined)?.asset?._ref

describe('a centre picture upload that finishes later', () => {
  it('keeps edits made while it was pending, and attaches the picture to the current edge', async () => {
    const seen = startUpload()
    fireEvent.change(screen.getByLabelText('Width of the artwork'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Small' }))
    expect(last(seen)?.width).toBe(60)
    await finish()
    expect(last(seen)?.width).toBe(60)
    expect(last(seen)?.height).toBe('small')
    expect(refOf(last(seen))).toBe(REF)
    expect(screen.getByText(/Added centre.png/)).toBeTruthy()
  })

  it('undoes to the value at the moment the picture was attached, not the one from the start of the upload', async () => {
    const seen = startUpload()
    fireEvent.change(screen.getByLabelText('Width of the artwork'), { target: { value: '60' } })
    await finish()
    fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }))
    // The picture is gone; the width edit made while waiting is not undone with it.
    expect(refOf(last(seen))).toBeUndefined()
    expect(last(seen)?.width).toBe(60)
    expect(last(seen)?.centre?.kind).toBe('image')
    fireEvent.click(screen.getByRole('button', { name: 'Undo last change' }))
    expect(last(seen)?.width).toBe(100)
  })

  it('does not attach it after the centre is switched away from Picture', async () => {
    const seen = startUpload()
    fireEvent.click(screen.getByRole('radio', { name: 'None' }))
    expect(last(seen)?.centre).toBeUndefined()
    await finish()
    expect(last(seen)?.centre).toBeUndefined()
    expect(JSON.stringify(last(seen))).not.toContain(REF)
  })

  it('does not attach it after switching to Icon', async () => {
    const seen = startUpload()
    fireEvent.click(screen.getByRole('radio', { name: 'Icon' }))
    await finish()
    expect(last(seen)?.centre?.kind).toBe('icon')
    expect(JSON.stringify(last(seen))).not.toContain(REF)
  })

  it('does not bring the edge back after Remove custom edge', async () => {
    const seen = startUpload()
    fireEvent.click(screen.getByRole('button', { name: 'Remove custom edge' }))
    expect(last(seen)).toBeUndefined()
    const writes = seen.length
    await finish()
    expect(last(seen)).toBeUndefined()
    expect(seen).toHaveLength(writes)
  })

  it('keeps picture B when upload A, started earlier, finishes last', async () => {
    const A = 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-640x480-png'
    const B = 'image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-640x480-png'
    const seen = startUpload() // upload A, pending
    fireEvent.click(screen.getByRole('radio', { name: 'None' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Picture' }))
    const input = document.querySelector<HTMLInputElement>('input[type=file]')
    if (!input) throw new Error('no picture control')
    fireEvent.change(input, {
      target: { files: [new File(['y'], 'b.png', { type: 'image/png' })] },
    })
    const [finishA, finishB] = pending.all
    if (!finishA || !finishB) throw new Error('two uploads expected')
    await act(async () => {
      finishB(B)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(refOf(last(seen))).toBe(B)
    await act(async () => {
      finishA(A)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(refOf(last(seen))).toBe(B)
    expect(JSON.stringify(last(seen))).not.toContain(A)
  })

  it('drops an earlier upload when a later one replaces it, whichever finishes first', async () => {
    const A = 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-640x480-png'
    const B = 'image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-640x480-png'
    const seen = startUpload() // A pending
    const input = document.querySelector<HTMLInputElement>('input[type=file]')
    if (!input) throw new Error('no picture control')
    fireEvent.change(input, {
      target: { files: [new File(['y'], 'b.png', { type: 'image/png' })] },
    })
    const [finishA, finishB] = pending.all
    if (!finishA || !finishB) throw new Error('two uploads expected')
    await act(async () => {
      finishA(A)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    // A finished first but B replaced it, so A is not attached and B still lands.
    expect(refOf(last(seen))).toBeUndefined()
    await act(async () => {
      finishB(B)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(refOf(last(seen))).toBe(B)
  })
})
