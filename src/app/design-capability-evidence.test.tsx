import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  fingerprint,
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '@/features/pages/components/section-renderer.fixtures'
import { caseId, casesOf } from '@/lib/design/capability-availability'
import { EVIDENCE, type Evidence, type Patch } from '@/lib/design/capability-evidence'
import { compareTarget } from '@/lib/design/capability-harness'
import { applyPatch, withPicture } from '@/lib/design/capability-patch'

/**
 * The evidence harness (task 275; README, "Design capability contract"): one case per registered
 * evidence entry and layout. Each renders the component as a page does (the section gallery's
 * fixtures, projected by the page query and drawn by SectionRenderer) with the probed field unset, then
 * with the probe, and requires the registered target to exist both times and to change. The unset
 * target is snapshotted, so an adoption that changes a component's default output shows in review.
 * Availability can only be verified for a layout whose case passes here.
 */

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: '',
    }),
}))
vi.mock('next/dynamic', async () => {
  const { lazy } = await import('react')
  return {
    default: (load: () => Promise<unknown>) =>
      lazy(async () => {
        const loaded = (await load()) as { default?: ComponentType } | undefined
        return { default: (loaded?.default ?? loaded) as ComponentType }
      }),
  }
})
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const ROOT = join(import.meta.dirname, '..', '..')

/** The probe's own fields, unset, so the first render really has the capability unset. */
const unsetFor = (probe: Patch): Patch =>
  Object.fromEntries(Object.keys(probe).map((path) => [path, null]))

async function draw(raw: RawSection) {
  // Not the first section, so nothing is held back for the page's <h1> or its first paint.
  return renderSections(await projectSections([raw]), { belowHeading: true })
}

async function runCase(entry: Evidence, layout: string | null) {
  const picture = await fixturePictureId()
  const seed = await gallerySeed(entry.component, layout)
  const unset = withPicture(
    applyPatch(applyPatch(seed, entry.base), unsetFor(entry.probe)),
    picture,
  )
  const probed = withPicture(applyPatch(unset, entry.probe), picture)
  return compareTarget(await draw(unset), await draw(probed), entry.target, entry.change)
}

const cases = EVIDENCE.flatMap((entry) =>
  casesOf(entry).map((layout) => ({ id: caseId(entry, layout), entry, layout })),
)

describe('design capability evidence', () => {
  it.each(cases)('$id: the probe changes the registered target', async ({ entry, layout }) => {
    const result = await runCase(entry, layout)
    expect(result.status).toBe('changed')
    expect(
      entry.change === 'attributes'
        ? result.unset
        : result.unset.map((html) => `${fingerprint(html)} (${String(html.length)} characters)`),
    ).toMatchSnapshot()
  })

  it.each(EVIDENCE.map((entry) => ({ id: entry.id, entry })))(
    '$id: the resolver and the render path it names exist',
    async ({ entry }) => {
      const exported = (await import(
        /* @vite-ignore */ entry.resolver.module.replace(/^@\//, '/src/')
      )) as Record<string, unknown>
      expect(typeof exported[entry.resolver.export]).toBe('function')
      expect(existsSync(join(ROOT, entry.render))).toBe(true)
    },
  )
})
