/**
 * Semantic parity between a page's JSON-LD and what visitors can see (E2 §3.5). Values are compared
 * by what they mean, in the class their property belongs to:
 *
 *  - visible facts (names, phones, emails, addresses, hours, prices, event dates, FAQ text) are
 *    compared as typed values: E.164 phones, address components, day and time ranges, dates, amount
 *    plus currency, folded names;
 *  - descriptive text (`description`, a WebPage's name) must come from a field the page renders;
 *  - `areaServed` must be visible somewhere on the site;
 *  - identity and technical properties (`@id`, `url`, `logo`, `image`, `sameAs`, `geo`...) are exempt
 *    from visibility but must be valid.
 *
 * "Visible" is the rendered page with hidden-by-design containers expanded (a closed accordion
 * counts). Pure and clock-free: the end-to-end spec (tests/e2e/structured-data.spec.ts) feeds it the
 * page's text; the node builders' tests feed it provenance.
 */
import { parseAuPhone } from '@/lib/au-phone'
import { normaliseText } from '@/lib/json-ld-visibility'
import { DAYS } from '@/lib/opening-hours'

import { valueAt } from './graph'
import { organizationId, websiteId } from './ids'
import type { Built, JsonLdNode, Source } from './types'

export interface ParityProblem {
  /** "Organization.address.streetAddress" */
  property: string
  value: string
  reason: string
}

// ---------------------------------------------------------------------------------------------
// Typed values
// ---------------------------------------------------------------------------------------------

const isRecord = (value: unknown): value is JsonLdNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Case, punctuation, diacritics and "&" / "and" folded away: "Café & Bar" equals "cafe and bar". */
export function foldName(text: string): string {
  return normaliseText(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whole-word containment, so "cafe" is not found in "cafeteria". Both sides must be folded. */
const containsPhrase = (haystack: string, needle: string) =>
  needle !== '' && ` ${haystack} `.includes(` ${needle} `)

const STREET_TYPES: Record<string, string> = {
  st: 'street',
  rd: 'road',
  ave: 'avenue',
  av: 'avenue',
  hwy: 'highway',
  ln: 'lane',
  dr: 'drive',
  pde: 'parade',
  ct: 'court',
  pl: 'place',
  cres: 'crescent',
  blvd: 'boulevard',
  tce: 'terrace',
  cl: 'close',
  sq: 'square',
  cct: 'circuit',
  esp: 'esplanade',
}

const STATES: readonly [string, string][] = [
  ['new south wales', 'nsw'],
  ['victoria', 'vic'],
  ['queensland', 'qld'],
  ['south australia', 'sa'],
  ['western australia', 'wa'],
  ['tasmania', 'tas'],
  ['northern territory', 'nt'],
  ['australian capital territory', 'act'],
]

/** An address (or part of one) folded so St = Street and New South Wales = NSW. */
export function foldAddress(text: string): string {
  let folded = ` ${foldName(text)} `
  for (const [name, abbreviation] of STATES)
    folded = folded.replaceAll(` ${name} `, ` ${abbreviation} `)
  return folded
    .trim()
    .split(' ')
    .map((word) => STREET_TYPES[word] ?? word)
    .join(' ')
}

/** A phone as E.164 where it is an Australian number, else its digits with any leading "+". */
export function phoneKey(value: string): string {
  return parseAuPhone(value)?.telephone ?? value.replace(/[^\d+]/g, '')
}

/** Every phone-like number in some text, as `phoneKey`s. */
function phonesIn(text: string): Set<string> {
  const keys = new Set<string>()
  for (const [match] of text.matchAll(/\+?\(?\d[\d\s().-]{5,}\d/g)) keys.add(phoneKey(match))
  return keys
}

/** Every time of day in some text, as minutes after midnight: "5:30 pm", "5.30pm", "17:30", "noon". */
export function timesIn(text: string): Set<number> {
  const found = new Set<number>()
  const lower = text.toLowerCase()
  const withSuffix = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/g
  for (const [, hours, minutes, suffix] of lower.matchAll(withSuffix)) {
    const hour = Number(hours) % 12
    found.add((hour + (suffix === 'pm' ? 12 : 0)) * 60 + Number(minutes ?? 0))
  }
  for (const [, hours, minutes] of lower
    .replace(withSuffix, ' ')
    .matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)) {
    found.add(Number(hours) * 60 + Number(minutes))
  }
  if (/\bnoon\b/.test(lower)) found.add(12 * 60)
  if (/\bmidnight\b/.test(lower)) found.add(0)
  return found
}

/** "17:30" -> 1050. */
export function minutesOf(time: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(time)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

const DAY_WORD =
  '(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)'
const DAY_RANGE = new RegExp(`\\b${DAY_WORD}\\b(?:\\s*(?:-|to)\\s*\\b${DAY_WORD}\\b)?`, 'g')
const dayIndex = (word: string) =>
  DAYS.findIndex(({ short }) => short.toLowerCase() === word.slice(0, 3))

/** Weekday names in some text, ranges expanded ("Mon–Fri" is five days), as indexes Monday = 0. */
export function daysIn(text: string): Set<number> {
  const found = new Set<number>()
  const lower = normaliseText(text)
  if (/\b(daily|every day|7 days)\b/.test(lower)) DAYS.forEach((_, index) => found.add(index))
  for (const [, first, last] of lower.matchAll(DAY_RANGE)) {
    const from = dayIndex(first ?? '')
    if (from < 0) continue
    const to = last ? dayIndex(last) : from
    // A range may wrap the week ("Fri–Mon").
    for (let day = from; ; day = (day + 1) % 7) {
      found.add(day)
      if (day === to) break
    }
  }
  return found
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_WORD =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

interface CalendarDate {
  year?: number
  month: number
  day: number
}

/** Calendar dates in some text: "14 March 2026", "Sat 14 Mar", "March 14, 2026", "14/03/2026", "2026-03-14". */
export function datesIn(text: string): CalendarDate[] {
  const lower = normaliseText(text)
  const dates: CalendarDate[] = []
  const monthOf = (word: string) => MONTHS.indexOf(word.slice(0, 3)) + 1

  for (const [, year, month, day] of lower.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    dates.push({ year: Number(year), month: Number(month), day: Number(day) })
  }
  for (const [, day, month, year] of lower.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    dates.push({ year: Number(year), month: Number(month), day: Number(day) })
  }
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_WORD}\\b(?:,?\\s+(\\d{4}))?`,
    'g',
  )
  for (const [, day, month, year] of lower.matchAll(dayFirst)) {
    dates.push({
      ...(year && { year: Number(year) }),
      month: monthOf(month ?? ''),
      day: Number(day),
    })
  }
  const monthFirst = new RegExp(
    `\\b${MONTH_WORD}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`,
    'g',
  )
  for (const [, month, day, year] of lower.matchAll(monthFirst)) {
    dates.push({
      ...(year && { year: Number(year) }),
      month: monthOf(month ?? ''),
      day: Number(day),
    })
  }
  return dates
}

/** Dollar amounts in some text: "$1,200.50", "A$99", "AUD 99". */
export function amountsIn(text: string): number[] {
  const amounts: number[] = []
  const lower = text.toLowerCase()
  const patterns = [
    /(?:a\$|au\$|aud\s?|\$)\s?(\d[\d,]*(?:\.\d+)?)/g,
    /(\d[\d,]*(?:\.\d+)?)\s?aud\b/g,
  ]
  for (const pattern of patterns) {
    for (const [, amount] of lower.matchAll(pattern))
      amounts.push(Number((amount ?? '').replaceAll(',', '')))
  }
  return amounts
}

// ---------------------------------------------------------------------------------------------
// What a page shows
// ---------------------------------------------------------------------------------------------

export interface ParityContext {
  /**
   * The page's rendered text with hidden-by-design containers (closed accordions, inactive tabs)
   * expanded, plus its <title> and meta description, which are the rendered form of the page's
   * title and description fields. Never text hidden from every visitor.
   */
  text: string
  /** Everything the site shows (all pages' text), for facts that need only appear somewhere. Defaults to `text`. */
  siteText?: string
  /** The production origin, to recognise the site's own Organization and WebSite nodes. */
  origin: string
  /**
   * False on a "Minimal page", whose header and footer hide the business's address, hours, phone
   * and email though the site-wide Organization still carries them.
   */
  siteDetails?: boolean
  /** The schema.org type the Organization should have (`businessSchemaType`); a mismatch is reported. */
  businessType?: string
}

class Seen {
  readonly folded: string
  readonly address: string
  readonly lower: string
  private phones?: Set<string>
  private times?: Set<number>
  private days?: Set<number>
  private dates?: CalendarDate[]
  private amounts?: number[]

  constructor(readonly raw: string) {
    this.folded = foldName(raw)
    this.address = foldAddress(raw)
    this.lower = raw.toLowerCase()
  }

  hasName(value: string) {
    return containsPhrase(this.folded, foldName(value))
  }
  hasAddressPart(value: string) {
    return containsPhrase(this.address, foldAddress(value))
  }
  hasPhone(value: string) {
    return (this.phones ??= phonesIn(this.raw)).has(phoneKey(value))
  }
  hasEmail(value: string) {
    return this.lower.includes(value.toLowerCase())
  }
  hasTime(minutes: number) {
    return (this.times ??= timesIn(this.raw)).has(minutes)
  }
  hasDay(day: number) {
    return (this.days ??= daysIn(this.raw)).has(day)
  }
  hasDate({ year, month, day }: CalendarDate) {
    return (this.dates ??= datesIn(this.raw)).some(
      (seen) =>
        seen.month === month &&
        seen.day === day &&
        (seen.year === undefined || year === undefined || seen.year === year),
    )
  }
  hasAmount(amount: number) {
    return (this.amounts ??= amountsIn(this.raw)).includes(amount)
  }
  /** Descriptive text may be cut short or stripped of formatting: its start must be on the page. */
  hasText(value: string) {
    const wanted = foldName(value.replace(/(\.\.\.|…)\s*$/, ''))
    return (
      containsPhrase(this.folded, wanted) ||
      containsPhrase(this.folded, wanted.split(' ').slice(0, 8).join(' '))
    )
  }
}

// ---------------------------------------------------------------------------------------------
// Property classes
// ---------------------------------------------------------------------------------------------

const DESCRIPTIVE = new Set(['description', 'abstract'])
const TECHNICAL_URLS = new Set(['url', 'logo', 'image', 'sameAs', 'item'])
const ADDRESS_PARTS = ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode'] as const
/** Nodes that describe the whole site: their descriptive text only has to be shown somewhere on it. */
const isSiteNode = (node: JsonLdNode, origin: string) =>
  node['@id'] === organizationId(origin) || node['@id'] === websiteId(origin)

const nodeLabel = (node: JsonLdNode) => {
  const type = node['@type']
  return Array.isArray(type) ? type.join('/') : typeof type === 'string' ? type : 'Thing'
}

const typesOf = (node: JsonLdNode): string[] => {
  const type = node['@type']
  return Array.isArray(type)
    ? type.filter((item): item is string => typeof item === 'string')
    : typeof type === 'string'
      ? [type]
      : []
}

const isAbsoluteUrl = (value: unknown) => {
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/** Australia's bounding box: a `geo` outside it is a typo (a swapped sign, a dropped digit). */
const inAustralia = (lat: number, lng: number) =>
  lat >= -44 && lat <= -9 && lng >= 112 && lng <= 154

/** Lines and comma-separated parts of a plain-text address ("1 Rose St, Newtown NSW 2042"). */
const addressParts = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)

/**
 * Every problem in a page's JSON-LD: visible facts that differ from what the page shows, descriptive
 * text with no rendered source, `areaServed` shown nowhere, invalid technical values, and the deny
 * list (`findDeniedClaims`).
 */
export function checkParity(nodes: readonly JsonLdNode[], context: ParityContext): ParityProblem[] {
  const { origin, siteDetails = true } = context
  const page = new Seen(context.text)
  const site = context.siteText === undefined ? page : new Seen(context.siteText)
  const problems: ParityProblem[] = []
  const add = (path: string[], value: unknown, reason: string) =>
    problems.push({
      property: path.join('.'),
      value: typeof value === 'string' ? value : JSON.stringify(value),
      reason,
    })

  const checkName = (path: string[], value: unknown) => {
    if (typeof value === 'string' && value.trim() && !page.hasName(value)) {
      add(path, value, "is not in the page's visible text")
    }
  }

  const checkAddress = (path: string[], value: unknown) => {
    if (typeof value === 'string') {
      for (const part of addressParts(value)) {
        if (!page.hasAddressPart(part)) add(path, part, 'is not in the page as an address')
      }
    } else if (isRecord(value)) {
      for (const part of ADDRESS_PARTS) {
        const component = value[part]
        if (typeof component === 'string' && component && !page.hasAddressPart(component)) {
          add([...path, part], component, 'is not in the page as an address')
        }
      }
    }
  }

  const checkHours = (path: string[], value: unknown) => {
    const specs = Array.isArray(value) ? value : [value]
    specs.forEach((spec, index) => {
      // Dated days (holidays) are shown in a different form and expire; the weekly hours are the fact.
      if (!isRecord(spec) || spec.validFrom || spec.validThrough) return
      const here = [...path.slice(0, -1), `openingHoursSpecification[${index}]`]
      const days = (Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek]).filter(
        (day): day is string => typeof day === 'string',
      )
      for (const day of days) {
        if (!page.hasDay(dayIndex(day.toLowerCase().slice(0, 3))))
          add([...here, 'dayOfWeek'], day, 'is not in the page as an opening day')
      }
      for (const field of ['opens', 'closes'] as const) {
        const time = spec[field]
        const minutes = typeof time === 'string' ? minutesOf(time) : null
        if (minutes !== null && !page.hasTime(minutes))
          add([...here, field], time, 'is not in the page as an opening time')
      }
    })
  }

  const checkDate = (path: string[], value: unknown) => {
    if (typeof value !== 'string') return
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(value)
    if (!match) return
    const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
    if (!page.hasDate(date)) add(path, value, 'is not on the page as a date')
    const minutes = match[4] ? minutesOf(match[4]) : null
    if (minutes !== null && !page.hasTime(minutes)) add(path, value, 'is not on the page as a time')
  }

  const checkPrice = (path: string[], offer: JsonLdNode) => {
    const price = Number(offer.price)
    if (!Number.isFinite(price)) return
    if (!page.hasAmount(price))
      add([...path, 'price'], offer.price, 'is not shown on the page as a price')
    const currency = offer.priceCurrency
    if (typeof currency === 'string' && currency !== 'AUD' && !page.raw.includes(currency)) {
      add([...path, 'priceCurrency'], currency, 'is not shown on the page (prices are in AUD)')
    }
  }

  const checkTechnical = (path: string[], key: string, value: unknown) => {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string' && !isAbsoluteUrl(item))
        add(path, item, `${key} must be an absolute URL`)
    }
  }

  const walk = (value: unknown, path: string[], owner: JsonLdNode, top: boolean) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, [...path.slice(0, -1), `${path.at(-1)}[${index}]`], owner, top)
      })
      return
    }
    if (!isRecord(value)) return

    const types = typesOf(value)
    const isSite = top && isSiteNode(value, origin)
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('@')) continue
      const childPath = [...path, key]
      const hiddenSiteDetail =
        top &&
        !siteDetails &&
        isSite &&
        ['address', 'openingHoursSpecification', 'telephone', 'email'].includes(key)

      if (hiddenSiteDetail) continue
      // The deny list owns FAQ text and credentials (a claim the page doesn't make is a denied claim).
      if (key === 'mainEntity' && types.includes('FAQPage')) continue
      if (key === 'hasCredential') continue

      if (key === 'name' || key === 'headline') {
        if (types.includes('WebPage') && key === 'name') {
          if (typeof child === 'string' && !page.hasText(child))
            add(childPath, child, 'is not a field this page renders (its title)')
        } else checkName(childPath, child)
      } else if (DESCRIPTIVE.has(key)) {
        const where = isSiteNode(owner, origin) ? site : page
        if (typeof child === 'string' && child.trim() && !where.hasText(child)) {
          add(childPath, child, 'does not come from a field the page renders')
        }
      } else if (key === 'telephone') {
        if (typeof child === 'string' && !page.hasPhone(child))
          add(childPath, child, 'is not in the page as a phone number')
      } else if (key === 'email') {
        if (typeof child === 'string' && !page.hasEmail(child))
          add(childPath, child, 'is not in the page')
      } else if (key === 'address') checkAddress(childPath, child)
      else if (key === 'openingHoursSpecification') checkHours(childPath, child)
      else if (key === 'startDate' || key === 'endDate') checkDate(childPath, child)
      else if (key === 'text' && path.at(-1)?.startsWith('acceptedAnswer'))
        checkName(childPath, child)
      else if (key === 'areaServed') {
        for (const item of Array.isArray(child) ? child : [child]) {
          const name = typeof item === 'string' ? item : isRecord(item) ? item.name : undefined
          if (typeof name === 'string' && !site.hasName(name))
            add(childPath, name, 'is not stated anywhere on the site')
        }
      } else if (key === 'geo' && isRecord(child)) {
        const { latitude, longitude } = child
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          !inAustralia(latitude, longitude)
        ) {
          add(childPath, child, 'is not a coordinate pair in Australia')
        }
      } else if (TECHNICAL_URLS.has(key)) checkTechnical(childPath, key, child)
      else if (key === 'offers') {
        for (const offer of Array.isArray(child) ? child : [child]) {
          if (isRecord(offer)) {
            checkPrice(childPath, offer)
            checkTechnical([...childPath, 'url'], 'url', offer.url)
          }
        }
      } else walk(child, childPath, owner, false)
    }
  }

  for (const node of nodes) walk(node, [nodeLabel(node)], node, true)

  if (context.businessType) {
    for (const node of nodes) {
      if (node['@id'] === organizationId(origin) && !typesOf(node).includes(context.businessType)) {
        add(
          [nodeLabel(node), '@type'],
          node['@type'],
          `does not match the business type ${context.businessType}`,
        )
      }
    }
  }

  return [...problems, ...findDeniedClaims(nodes, context)]
}

// ---------------------------------------------------------------------------------------------
// Deny list
// ---------------------------------------------------------------------------------------------

/** Walks every object in the nodes, however deep. */
function everyObject(
  value: unknown,
  visit: (object: JsonLdNode, path: string[]) => void,
  path: string[] = [],
) {
  if (Array.isArray(value))
    value.forEach((item, index) => {
      everyObject(item, visit, [...path.slice(0, -1), `${path.at(-1)}[${index}]`])
    })
  else if (isRecord(value)) {
    visit(value, path)
    for (const [key, child] of Object.entries(value)) everyObject(child, visit, [...path, key])
  }
}

/**
 * Claims the template never makes (E2 §3.4): self-serving ratings and reviews, offers or products
 * without a visible price, FAQs that aren't on the page, and credentials the page doesn't show.
 */
export function findDeniedClaims(
  nodes: readonly JsonLdNode[],
  context: Pick<ParityContext, 'text'>,
): ParityProblem[] {
  const page = new Seen(context.text)
  const problems: ParityProblem[] = []
  const add = (path: string[], value: string, reason: string) =>
    problems.push({ property: path.join('.'), value, reason })

  for (const node of nodes) {
    everyObject(
      node,
      (object, path) => {
        const here = path.length === 0 ? [nodeLabel(node)] : path
        const types = typesOf(object)

        if (
          types.some((type) => type === 'AggregateRating' || type === 'Review' || type === 'Rating')
        ) {
          add(here, types.join('/'), 'ratings and reviews are not marked up')
        }
        for (const key of ['aggregateRating', 'review', 'reviewRating']) {
          if (key in object) add([...here, key], key, 'ratings and reviews are not marked up')
        }
        if (types.includes('Product') && !hasVisiblePricedOffer(object, page)) {
          add(here, 'Product', 'a product needs an offer whose price the page shows')
        }
        if (
          types.includes('Offer') &&
          object.price !== undefined &&
          !page.hasAmount(Number(object.price))
        ) {
          add(
            [...here, 'price'],
            String(Number(object.price)),
            'an offer needs a price the page shows',
          )
        }
        if (types.includes('FAQPage')) {
          const entities = Array.isArray(object.mainEntity) ? object.mainEntity : []
          entities.forEach((question, index) => {
            if (!isRecord(question)) return
            const name = question.name
            if (typeof name === 'string' && !page.hasName(name)) {
              add(
                [...here, `mainEntity[${index}]`, 'name'],
                name,
                'this FAQ question is not on the page',
              )
            }
            const answer = isRecord(question.acceptedAnswer)
              ? question.acceptedAnswer.text
              : undefined
            if (typeof answer === 'string') {
              for (const line of answer.split(/\n+/).filter((part) => part.trim())) {
                if (!page.hasName(line)) {
                  add(
                    [...here, `mainEntity[${index}]`, 'acceptedAnswer', 'text'],
                    line,
                    'this FAQ answer is not on the page',
                  )
                }
              }
            }
          })
        }
        if ('hasCredential' in object) {
          for (const credential of Array.isArray(object.hasCredential)
            ? object.hasCredential
            : [object.hasCredential]) {
            const name = isRecord(credential) ? credential.name : undefined
            if (typeof name === 'string' && !page.hasName(name)) {
              add(
                [...here, 'hasCredential', 'name'],
                name,
                'this credential is not shown on the page',
              )
            }
          }
        }
      },
      [],
    )
  }
  return problems
}

function hasVisiblePricedOffer(product: JsonLdNode, page: Seen): boolean {
  return (Array.isArray(product.offers) ? product.offers : [product.offers]).some(
    (offer) => isRecord(offer) && offer.price !== undefined && page.hasAmount(Number(offer.price)),
  )
}

// ---------------------------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------------------------

const sourceKey = ({ doc, field }: Source) => `${doc}.${field}`

/**
 * Descriptive text must come from a field the page renders. `rendered` lists those fields as
 * `{ doc, field }`; a description whose source isn't among them (or has none) is reported.
 */
export function checkDescriptiveProvenance(
  built: Built,
  rendered: readonly Source[],
): ParityProblem[] {
  const shown = new Set(rendered.map(sourceKey))
  const problems: ParityProblem[] = []
  for (const property of Object.keys(built.provenance)) {
    const leaf = property.split('.').at(-1) ?? ''
    if (!DESCRIPTIVE.has(leaf)) continue
    const source = built.provenance[property]
    if (!source || !shown.has(sourceKey(source))) {
      problems.push({
        property,
        value: String(valueAt(built.node, property)),
        reason: `comes from ${source ? sourceKey(source) : 'no recorded field'}, which this page does not render`,
      })
    }
  }
  return problems
}

/** Whether two values of the same property mean the same thing (a phone as E.164, a name folded). */
function sameValue(property: string, a: unknown, b: unknown): boolean {
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b)
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const leaf = property.split('.').at(-1) ?? ''
  if (leaf === 'telephone') return phoneKey(a) === phoneKey(b)
  if (leaf === 'email') return a.toLowerCase() === b.toLowerCase()
  if (leaf.startsWith('address') || leaf === 'streetAddress')
    return foldAddress(a) === foldAddress(b)
  return foldName(a) === foldName(b)
}

/**
 * A JSON-LD value must equal its owning field. `owner` reads the field a provenance entry names
 * (`{ doc, field }`) from the content; values that differ by type-aware comparison are reported.
 */
export function checkAgainstOwners(
  built: Built,
  owner: (source: Source) => unknown,
): ParityProblem[] {
  const problems: ParityProblem[] = []
  for (const [property, source] of Object.entries(built.provenance)) {
    const value = valueAt(built.node, property)
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const owned = owner(source)
    if (typeof owned !== 'string' && typeof owned !== 'number') continue
    if (!sameValue(property, value, owned)) {
      problems.push({
        property,
        value: String(value),
        reason: `differs from its owning field ${sourceKey(source)} ("${String(owned)}")`,
      })
    }
  }
  return problems
}
