/**
 * The pure half of scripts/build-design-manifest.mjs: turns schema definitions into the manifest.
 * Everything it needs from the site (the schemas, the rules registry, the client-editable registry)
 * is passed in, so tests can build a manifest from a small in-memory schema.
 *
 * Nothing here runs a validation function. A constraint that lives only in a validator is reported as
 * undetermined (null), never as absent: see `constraints`.
 */

/** Section families: each must carry `options.manifest.purpose`, or the build fails. */
export const FAMILY_TYPES = ['hero', 'mediaText']

const MAX_DEPTH = 6

/** Kinds that never carry a length or count limit. */
const UNLIMITED = new Set(['boolean', 'reference', 'date', 'datetime', 'image', 'file'])

/**
 * What the manifest can say about a constraint without running a validator:
 *   required: true (schema.json marks it required), false (the field declares no validation, so
 *             nothing can require it), or null (it has validation we do not interpret)
 *   max:      a number (the section's exported LIMITS), absent (a field with no validation
 *             has no maximum), or null (it has validation we do not interpret)
 */
export function constraints(field, { requiredBySchema, limit }) {
  const validated = field.validation !== undefined
  const maximum =
    limit !== undefined
      ? { max: limit }
      : validated && !UNLIMITED.has(field.type)
        ? { max: null }
        : {}
  return { required: requiredBySchema ? true : validated ? null : false, ...maximum }
}

/** The `{ value, title }` pairs of an `options.list`, or undefined when the field has none. */
export function listOf(field) {
  const list = field.options?.list
  if (!Array.isArray(list) || list.length === 0) return undefined
  const entries = list
    .map((entry) =>
      typeof entry === 'string' || typeof entry === 'number'
        ? { value: entry, title: String(entry) }
        : {
            value: entry.value ?? entry.title,
            title: typeof entry.title === 'string' ? entry.title : String(entry.value),
          },
    )
    .filter((entry) => entry.value !== undefined)
  return entries.length > 0 ? entries : undefined
}

/** The attributes `sanity schema extract` recorded for a node of schema.json (a type's value, or a field's). */
function attributesOf(node, namedAttributes) {
  if (!node) return undefined
  if (node.type === 'inline') return namedAttributes(node.name)
  if (node.type === 'object') {
    const inherited = node.rest?.type === 'inline' ? namedAttributes(node.rest.name) : undefined
    return { ...inherited, ...node.attributes }
  }
  return undefined
}

/** The schema.json node describing one member of an array field (matched by type name when there are several). */
function memberNode(arrayValue, typeName) {
  const of = arrayValue?.of
  if (!of) return undefined
  if (of.type !== 'union') return of
  return of.of.find((entry) => entry.rest?.name === typeName || entry.name === typeName) ?? of.of[0]
}

/**
 * Walks field definitions into manifest rows.
 *
 * @param fields       the definitions (`defineField` objects)
 * @param context      { types, rootType, topField?, attributes?, prefix, stack, limits, editable }
 */
function walkFields(fields, context, depth = 0) {
  const rows = []
  for (const field of fields ?? []) {
    const top = context.topField ?? field.name
    const path = `${context.prefix}${field.name}`
    const attribute = context.attributes?.[field.name]
    rows.push(
      ...describe(
        field,
        path,
        top,
        attribute?.value,
        attribute?.optional === false,
        context,
        depth,
      ),
    )
  }
  return rows
}

function describe(field, path, topField, schemaValue, required, context, depth) {
  const named = context.types.get(field.type)
  const row = {
    path,
    kind: field.type,
    ...constraints(field, {
      requiredBySchema: required,
      limit: context.prefix === '' ? context.limits?.[field.name] : undefined,
    }),
    ...(listOf(field) ? { list: listOf(field) } : {}),
    clientEditable: context.editable(context.rootType, topField),
  }
  const rows = [row]
  if (depth >= MAX_DEPTH) return rows

  const child = (fields, prefix, attributes, extraStack) =>
    walkFields(
      fields,
      { ...context, topField, prefix, attributes, stack: [...context.stack, ...extraStack] },
      depth + 1,
    )

  if (field.type === 'array') {
    const members = field.of ?? []
    for (const member of members) {
      const typeName = member.type
      const suffix = members.length > 1 ? `[${typeName}]` : '[]'
      const memberPath = `${path}${suffix}`
      const node = memberNode(schemaValue, typeName)
      const memberNamed = context.types.get(typeName)
      const memberFields = member.fields ?? memberNamed?.fields
      if (memberFields && !context.stack.includes(typeName)) {
        const attributes = attributesOf(node, context.namedAttributes)
        rows.push(...child(memberFields, `${memberPath}.`, attributes, [typeName]))
      } else if (!memberFields) {
        rows.push({
          path: memberPath,
          kind: typeName,
          ...constraints(member, { requiredBySchema: false }),
          ...(listOf(member) ? { list: listOf(member) } : {}),
          clientEditable: row.clientEditable,
        })
      }
    }
    return rows
  }

  const ownFields =
    field.fields ?? (named && named.name !== 'sectionStyle' ? named.fields : undefined)
  if (ownFields && !context.stack.includes(field.type)) {
    const attributes = attributesOf(schemaValue, context.namedAttributes)
    rows.push(...child(ownFields, `${path}.`, attributes, [field.type]))
  }
  return rows
}

/** The manifest rows for one type's fields. */
export function describeFields(type, deps, { limits } = {}) {
  return walkFields(type.fields, {
    types: deps.types,
    rootType: type.name,
    attributes: deps.namedAttributes(type.name),
    namedAttributes: deps.namedAttributes,
    editable: deps.isClientEditable,
    prefix: '',
    stack: [type.name],
    limits,
  })
}

/** Evaluates a section's registered rules for every layout, and once with none chosen. */
export function evaluateRules(type, variants, rulesFor) {
  const rules = rulesFor(type)
  const evaluate = (variant) => {
    const section = { _type: type, ...(variant === null ? {} : { variant }) }
    return {
      variant,
      hasPicture: rules.hasPicture?.(section) === true,
      fixesAlignment: rules.fixesAlignment?.(section) === true,
      hasOwnBackgroundImage: rules.hasOwnBackgroundImage?.(section) === true,
    }
  }
  return [null, ...variants.map((variant) => variant.value)].map(evaluate)
}

/**
 * The registry slots a section offers: `<section>.<field>` where the section has that field. The
 * registry's `max` is the slot field's known maximum.
 */
function sectionSlots(section, deps) {
  const fieldNames = new Set((section.fields ?? []).map((field) => field.name))
  return Object.keys(deps.slots?.SLOTS ?? {})
    .map((slot) => ({ slot, family: slot.split('.')[0], path: slot.split('.')[1] }))
    .filter(({ family, path }) => family === section.name && fieldNames.has(path))
}

function describeSection(section, deps) {
  const manifest = section.options?.manifest
  const slots = sectionSlots(section, deps)
  const limits = {
    ...deps.limitsFor(section.name),
    ...Object.fromEntries(slots.map(({ slot, path }) => [path, deps.slots.SLOTS[slot].max])),
  }
  const fields = describeFields(section, deps, { limits })
  const variants = listOf((section.fields ?? []).find((field) => field.name === 'variant') ?? {})
  return {
    type: section.name,
    title: section.title ?? section.name,
    ...(manifest?.purpose ? { purpose: manifest.purpose } : {}),
    ...(manifest?.example ? { example: manifest.example } : {}),
    fields,
    ...(variants ? { variants } : {}),
    ...(slots.length > 0 ? { slots: slots.map(({ slot, path }) => ({ slot, path })) } : {}),
    presets: (section.options?.presets ?? []).map(({ value, title, set }) => ({
      value,
      title,
      set,
    })),
    rules: evaluateRules(section.name, variants ?? [], deps.rulesFor),
  }
}

/** Section families that have no purpose, for the check. */
export function missingPurposes(sectionTypes, families = FAMILY_TYPES) {
  // A family a client site has removed is not required.
  return sectionTypes
    .filter((type) => families.includes(type.name))
    .filter((type) => !type.options?.manifest?.purpose)
    .map((type) => type.name)
}

/** Every slot in the shared registry, with the blocks it accepts and each block's fields. */
function describeSlots(deps) {
  const { SLOTS = {}, SLOT_BLOCKS = {} } = deps.slots ?? {}
  return Object.entries(SLOTS).map(([slot, { title, max }]) => ({
    slot,
    title,
    max,
    blocks: Object.entries(SLOT_BLOCKS)
      .filter(([, block]) => block.allowedIn.includes(slot))
      .map(([type, block]) => {
        const definition = deps.types.get(block.schemaType)
        if (!definition) {
          throw new Error(
            `The slot registry lists ${type}, but no schema type ${block.schemaType} was loaded.`,
          )
        }
        return {
          type,
          noun: block.noun,
          clientEditable: block.clientEditable,
          fields: describeFields(definition, deps),
        }
      }),
  }))
}

/**
 * Builds the manifest.
 *
 * @param deps.version          template version (template-version.json)
 * @param deps.sectionTypes     the section registry
 * @param deps.sharedTypes      named object types sections may reference (cta, link, ...)
 * @param deps.sectionStyle     the shared section style type
 * @param deps.designSettings   the Brand colours document type
 * @param deps.tokens           tokens.json
 * @param deps.schemaJson       schema.json from `sanity schema extract` (which fields are required)
 * @param deps.rulesFor         (type) => registered section rules
 * @param deps.isClientEditable (type, field) => boolean
 * @param deps.slots           { SLOTS, SLOT_BLOCKS } from the shared slot registry
 * @param deps.limitsFor        (type) => the section's exported LIMITS, if any
 */
export function buildDesignManifest(deps) {
  const types = new Map(
    [...deps.sharedTypes, ...deps.sectionTypes, deps.sectionStyle, deps.designSettings]
      .filter(Boolean)
      .map((type) => [type.name, type]),
  )
  const schemaByName = new Map((deps.schemaJson ?? []).map((entry) => [entry.name, entry]))
  const resolved = {
    ...deps,
    types,
    namedAttributes: (name) => schemaByName.get(name)?.value?.attributes,
  }

  const missing = missingPurposes(deps.sectionTypes)
  if (missing.length > 0) {
    throw new Error(
      `Add options.manifest = { purpose } to: ${missing.join(', ')}. Section families must say what they are for.`,
    )
  }

  const tokens = {}
  for (const [group, values] of Object.entries(deps.tokens ?? {})) {
    if (group.startsWith('$') || typeof values !== 'object' || values === null) continue
    tokens[group] = Object.keys(values)
  }

  return {
    manifestVersion: deps.version,
    slots: describeSlots(resolved),
    sections: deps.sectionTypes.map((section) => describeSection(section, resolved)),
    sectionStyle: { fields: describeFields(deps.sectionStyle, resolved) },
    designSettings: { fields: describeFields(deps.designSettings, resolved) },
    tokens,
  }
}
