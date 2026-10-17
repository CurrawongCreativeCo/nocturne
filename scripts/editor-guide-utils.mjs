/**
 * Pure helpers for scripts/build-editor-guide.mjs, kept apart so they can be unit tested without
 * loading the Studio schema. Nothing here reads the file system or the clock, so the same inputs
 * always give the same output (CI compares the committed file with a fresh run).
 */

/** Splits `---` frontmatter (flat `key: value` lines) from the body of a guide. */
export function parseGuide(fileName, text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!match) throw new Error(`${fileName}: add frontmatter (--- title: … ---) at the top.`)
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-zA-Z]+):\s*(.*)$/.exec(line)
    if (pair) meta[pair[1]] = pair[2].trim()
  }
  const id = fileName.replace(/\.md$/, '')
  if (!meta.title) throw new Error(`${fileName}: frontmatter needs a title.`)
  const order = Number(meta.order ?? 100)
  if (!Number.isFinite(order)) throw new Error(`${fileName}: order must be a number.`)

  const body = match[2]
    // Authoring notes (the video placeholder) are for the template's maintainers, not editors.
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    // The guide's title is shown by the Studio, so the first "# Title" line would repeat it.
    .replace(/^\s*# .*\r?\n/, '')
    .trim()

  return {
    id,
    title: meta.title,
    summary: meta.summary ?? '',
    order,
    ...(meta.feature ? { feature: meta.feature } : {}),
    ...(meta.requires ? { requires: meta.requires } : {}),
    body,
  }
}

/** "heroImage" -> "Hero image" (what Sanity shows when a field has no title). */
export function startCase(name) {
  const words = String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The "Recommended: 1600 × 1200 px, landscape." sentence `imageField` adds to a description. */
export function splitImageAdvice(description) {
  const text = description ?? ''
  const match = /Recommended: (.+?)\.(?=\s|$)/.exec(text)
  if (!match) return { description: text.trim(), imageSize: undefined }
  return {
    description: text
      .replace(match[0], '')
      .replace(/\s{2,}/g, ' ')
      .trim(),
    imageSize: `${match[1]}.`,
  }
}

/**
 * Runs a field's `validation` against a recording stand-in for Sanity's Rule and returns the
 * limits it asked for. Custom checks are ignored; a validator that needs a real Rule is skipped.
 */
export function recordLimits(validation) {
  if (typeof validation !== 'function') return {}
  const limits = {}
  const rule = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === 'min' || key === 'max' || key === 'length') {
          return (value) => {
            if (typeof value === 'number') limits[key] = value
            return rule
          }
        }
        if (key === 'required') {
          return () => {
            limits.required = true
            return rule
          }
        }
        return () => rule
      },
    },
  )
  try {
    validation(rule)
  } catch {
    // A validator that reads real Rule internals tells us nothing; leave its limits out.
  }
  return limits
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

/** "Up to 80 characters", "2 to 4 items": the limit as an editor would say it. */
export function describeLimits(type, { min, max, length } = {}) {
  const unit = type === 'array' ? ['item', 'items'] : ['character', 'characters']
  if (type !== 'array' && type !== 'string' && type !== 'text') return undefined
  if (length !== undefined) return `Exactly ${plural(length, ...unit)}`
  if (min !== undefined && max !== undefined) {
    return min === max ? `Exactly ${plural(max, ...unit)}` : `${min} to ${plural(max, ...unit)}`
  }
  if (max !== undefined) return `Up to ${plural(max, ...unit)}`
  // A minimum of one is the same as "required"; only mention larger minimums.
  if (min !== undefined && min > 1) return `At least ${plural(min, ...unit)}`
  return undefined
}

/** A plain-English name for how a field is edited. */
export function fieldKind(type) {
  switch (type) {
    case 'string':
      return 'Short text'
    case 'text':
      return 'Long text'
    case 'blockContent':
    case 'headingText':
      return 'Formatted text'
    case 'image':
      return 'Image'
    case 'boolean':
      return 'Switch'
    case 'number':
      return 'Number'
    case 'array':
      return 'List'
    case 'link':
    case 'cta':
      return 'Link'
    case 'reference':
      return 'Reference'
    default:
      return 'Other'
  }
}

/** What a client sees: the content tab, minus fields hidden for everyone or from clients. */
const isEditorField = (field, agencyOnly) =>
  field.hidden !== true &&
  field.hidden !== agencyOnly &&
  (field.group === undefined || field.group === 'content')

/** One field, as the guide shows it. */
function describeField(field, depth, agencyOnly) {
  const { description, imageSize } = splitImageAdvice(field.description)
  const limits = recordLimits(field.validation)
  const choices = field.options?.list
    ?.map((entry) =>
      typeof entry === 'string' ? startCase(entry) : (entry.title ?? startCase(entry.value)),
    )
    .filter(Boolean)

  const described = {
    name: field.name,
    title: field.title ?? startCase(field.name),
    kind: choices?.length ? 'Choice' : fieldKind(field.type),
    required: limits.required === true,
    ...(description ? { description } : {}),
    ...(imageSize ? { imageSize } : {}),
    ...(describeLimits(field.type, limits) ? { length: describeLimits(field.type, limits) } : {}),
    ...(choices?.length ? { choices } : {}),
  }

  // One level of list items (an FAQ's questions): enough to say what each item holds.
  const member =
    field.type === 'array' ? field.of?.find((entry) => Array.isArray(entry.fields)) : undefined
  if (member && depth === 0) {
    const items = describeFields(member.fields, 1, agencyOnly)
    if (items.length > 0) described.items = items
  }
  return described
}

function describeFields(fields, depth, agencyOnly) {
  return (fields ?? [])
    .filter((field) => isEditorField(field, agencyOnly))
    .map((field) => describeField(field, depth, agencyOnly))
}

/** The field names a document or object type stores, from `sanity schema extract`'s schema.json. */
export function schemaFieldNames(schemaJson, typeName) {
  const entry = schemaJson.find((item) => item.name === typeName)
  const attributes = entry?.value?.attributes
  return attributes ? new Set(Object.keys(attributes)) : undefined
}

export function schemaHasType(schemaJson, typeName) {
  return schemaJson.some((item) => item.name === typeName)
}

/**
 * One section type for the guide: its editor-facing fields (the content tab, not the agency's
 * Design tab) that schema.json confirms are stored. Returns undefined when schema.json has no such
 * type, so a section removed from a client site never shows up.
 */
export function describeSection(sectionType, schemaJson, agencyOnly) {
  const stored = schemaFieldNames(schemaJson, sectionType.name)
  if (!stored) return undefined
  const fields = describeFields(
    sectionType.fields.filter((field) => stored.has(field.name)),
    0,
    agencyOnly,
  )
  return {
    name: sectionType.name,
    title: sectionType.title ?? startCase(sectionType.name),
    ...(sectionType.description ? { description: sectionType.description } : {}),
    fields,
  }
}

/**
 * The editor guide for one site.
 * - `guides`: parsed guide files; one whose `feature` is off in the profile, or whose `requires`
 *   document type is not in schema.json, is left out.
 * - `sectionTypes`: the section registry (Studio schema types).
 * - `clientSections`: the section names clients may add (the profile's list, or the Studio default).
 * - `agencyOnly`: the `hidden` callback that hides a field from clients (`hiddenFromClients`).
 */
export function buildEditorGuide({
  guides,
  sectionTypes,
  schemaJson,
  features,
  clientSections,
  agencyOnly,
}) {
  const included = guides
    .filter((guide) => !guide.feature || features[guide.feature] === true)
    .filter((guide) => !guide.requires || schemaHasType(schemaJson, guide.requires))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map(({ id, title, summary, body }) => ({ id, title, summary, body }))

  const sections = sectionTypes
    .filter((type) => clientSections.has(type.name))
    .map((type) => describeSection(type, schemaJson, agencyOnly))
    .filter(Boolean)

  return { guides: included, sections }
}
