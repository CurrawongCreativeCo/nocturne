import type {
  CapabilityId,
  DesignCapabilityDeclaration,
  SharedBuilder,
} from '@/lib/design/capabilities'

declare module 'sanity' {
  interface BaseSchemaTypeOptions {
    /**
     * The design capability this field is (lib/design/capabilities.ts). Set by the shared builder that
     * made the field, or by `markCapability` on a field the exception register lists.
     */
    capability?: CapabilityId
    /** The shared builder that made this field: how the capability checks tell shared from private. */
    designBuilder?: SharedBuilder
    /** On a section, slot block or listing type: what it should offer (task 275). */
    designCapabilities?: DesignCapabilityDeclaration
  }
}

/**
 * How a field says which shared design capability it is and what made it (README, "Design capability
 * contract"). Only options change: nothing is stored, and the Studio draws the field as before.
 */

type WithOptions = object & { options?: unknown }

function withOptions<T extends WithOptions>(field: T, extra: Record<string, unknown>): T {
  const options = (field.options ?? {}) as Record<string, unknown>
  return { ...field, options: { ...options, ...extra } }
}

/** Marks a field a shared builder made, and the capability it is when it is one. */
export function builtBy<T extends WithOptions>(
  designBuilder: SharedBuilder,
  field: T,
  capability?: CapabilityId,
): T {
  return withOptions(field, { designBuilder, ...(capability ? { capability } : {}) })
}

/**
 * Marks a field the exception register lists (lib/design/capability-exceptions.ts) with the capability
 * it is, until a shared builder replaces it. The checks reject this marker on any other field, and an
 * exception never counts as evidence.
 */
export function markCapability<T extends WithOptions>(capability: CapabilityId, field: T): T {
  return withOptions(field, { capability })
}

/** `markCapability` on each field the map names (fields in the exception register only). */
export function markFields<T extends WithOptions & { name: string }>(
  capabilities: Readonly<Partial<Record<string, CapabilityId>>>,
  fields: readonly T[],
): T[] {
  return fields.map((field) => {
    const capability = capabilities[field.name]
    return capability ? markCapability(capability, field) : field
  })
}
