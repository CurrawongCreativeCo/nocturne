import { createHash } from 'node:crypto'

import * as groq from 'groq-js'
import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'

import type { LocationBusiness } from '@/types/business'

import { pageBuilderFragment } from '../api/sections'
import type { PageSection, SectionGate } from '../types'
import { SectionRenderer } from './section-renderer'

/**
 * Renders page sections exactly as a page does, for unit tests that need a section's real output:
 * the section gallery's fixture content (tests/e2e/fixtures/dataset.mjs), projected by the page
 * query's own GROQ fragment (groq-js, as the fake Content Lake does), drawn by SectionRenderer and
 * streamed, so async parts (a panel's site design, a members-only gate) finish before the HTML is read.
 *
 * The test file mocks what needs Next.js or a Sanity project (see section-renderer-parity.test.tsx),
 * and fakes `Date` before anything imports the fixtures, whose event dates are relative to today.
 */

/** A raw section as stored in a document (before projection). */
export type RawSection = Record<string, unknown> & { _key: string; _type: string }

const business: LocationBusiness = {
  tradingName: 'Test Co',
  phone: '(02) 9876 5432',
  phoneHref: '+61298765432',
  publicEmail: 'hello@example.com',
  address: { street: '1 King Street', suburb: 'Newtown', state: 'NSW', postcode: '2042' },
  geo: null,
  timeZone: 'Australia/Sydney',
  openingHours: [
    { _key: 'a', days: ['mon', 'tue'], opens: '08:00', closes: '17:30', closed: null },
  ],
  specialHours: null,
  socialLinks: null,
  specialDays: [],
}

interface Dataset {
  documents: Record<string, unknown>[]
}

let dataset: Promise<Dataset> | undefined
/** The e2e fixture documents, imported once and only when first needed (after `Date` is faked). */
function loadDataset(): Promise<Dataset> {
  dataset ??= import('../../../../tests/e2e/fixtures/dataset.mjs') as Promise<Dataset>
  return dataset
}

// groq-js 2's type declarations don't resolve under our lint setup, so type the two calls we use.
const { evaluate, parse } = groq as unknown as {
  parse: (query: string, options: { params: Record<string, unknown> }) => unknown
  evaluate: (
    tree: unknown,
    options: { dataset: object[]; params: Record<string, unknown>; timestamp: Date },
  ) => Promise<{ get: () => Promise<unknown> }>
}

const PROBE_ID = 'section-renderer-fixture'
const query = parse(
  `*[_id == "${PROBE_ID}"][0]{ "sections": pageBuilder[]{ ${pageBuilderFragment} } }`,
  { params: { members: true } },
)

/** The sections as the page query returns them: references resolved, images expanded. */
export async function projectSections(raw: readonly RawSection[]): Promise<PageSection[]> {
  const { documents } = await loadDataset()
  const value = await evaluate(query, {
    dataset: [...documents, { _id: PROBE_ID, _type: 'page', pageBuilder: raw }],
    params: { members: true },
    timestamp: new Date(),
  })
  const result = (await value.get()) as { sections: PageSection[] | null } | null
  return result?.sections ?? []
}

/** The fixtures' picture asset, for content that needs a real image. */
export async function fixturePictureId(): Promise<string> {
  const { documents } = await loadDataset()
  const asset = documents.find((doc) => doc._type === 'sanity.imageAsset')
  if (typeof asset?._id !== 'string') throw new Error('The fixtures have no picture asset.')
  return asset._id
}

/** The gallery page's sections in page order, without the halves drawn inside another's frame. */
export async function gallerySections(): Promise<RawSection[]> {
  const { documents } = await loadDataset()
  const gallery = documents.find((doc) => doc._id === 'page-section-gallery') as
    { pageBuilder: RawSection[] } | undefined
  if (!gallery) throw new Error('The section gallery page is missing from the fixtures.')
  return gallery.pageBuilder.filter((section) => !section._key.endsWith('--below'))
}

/**
 * A gallery section of `type` drawn in `layout`: the gallery's own entry for that layout when it has
 * one, else the type's first entry switched to it. A copy, so callers can change it.
 */
export async function gallerySeed(type: string, layout: string | null): Promise<RawSection> {
  const sections = (await gallerySections()).filter((section) => section._type === type)
  const exact =
    layout === null ? sections[0] : sections.find((section) => section.variant === layout)
  const seed = exact ?? sections[0]
  if (!seed) throw new Error(`The section gallery has no ${type} section to start from.`)
  const copy = structuredClone(seed)
  if (layout !== null) copy.variant = layout
  return copy
}

export interface RenderOptions {
  /** Draft mode: Visual Editing attributes on each section. */
  editable?: boolean
  gate?: SectionGate
  /** The page draws its own heading, so no section is the first (and every one may animate). */
  belowHeading?: boolean
}

/** The HTML SectionRenderer streams for these (already projected) sections. */
export async function renderSections(
  sections: readonly PageSection[],
  options: RenderOptions = {},
): Promise<string> {
  const errors: unknown[] = []
  const stream = await renderToReadableStream(
    createElement(SectionRenderer, {
      documentId: 'fixture-page',
      documentType: 'page',
      sections: [...sections],
      pageUrl: 'https://example.com/fixture-page',
      renderForm: (form) => createElement('form', { 'data-form': form._id }),
      renderCheckout: (request) =>
        createElement('button', { type: 'button', 'data-price': request.priceId }, request.label),
      renderNewsletter: (request) =>
        createElement('form', { 'data-newsletter': request.headingId }, request.submitLabel),
      business,
      ...options,
    }),
    {
      onError: (error) => {
        errors.push(error)
      },
    },
  )
  await stream.allReady
  const html = await new Response(stream).text()
  if (errors.length > 0) throw errors[0] instanceof Error ? errors[0] : new Error(String(errors[0]))
  return html
}

/** A short, stable fingerprint of some output, for snapshots that must not change. */
export const fingerprint = (html: string) =>
  createHash('sha256').update(html).digest('hex').slice(0, 16)
