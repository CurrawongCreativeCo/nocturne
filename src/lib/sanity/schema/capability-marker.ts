import { stampProvenance } from '@/lib/design/builder-provenance'
import type {
  CapabilityId,
  DesignCapabilityDeclaration,
  SharedBuilder,
  TextRole,
} from '@/lib/design/capabilities'

declare module 'sanity' {
  interface BaseSchemaTypeOptions {
    /**
     * The design capability this field is (lib/design/capabilities.ts). Set by the shared builder that
     * made the field, or by `markCapability` on a field the exception register lists.
     */
    capability?: CapabilityId
    /**
     * The text role a text style field is for. Set by the builder with its stamp: a role typed by hand,
     * or one that differs from the stamp, makes the field forged.
     */
    textRole?: TextRole
    /** On a section, slot block or listing type: what it should offer (task 275). */
    designCapabilities?: DesignCapabilityDeclaration
  }
}

/**
 * How a field says which shared design capability it is and what made it (README, "Design capability
 * contract"). Only options change: nothing is stored, and the Studio draws the field as before. What
 * made a field is a provenance stamp (lib/design/builder-provenance.ts) that can't be typed by hand;
 * each builder may stamp only from its own module, which a test checks.
 */

type WithOptions = object & { name?: string; options?: unknown }

function withOptions<T extends WithOptions>(field: T, extra: Record<string, unknown>): T {
  const options = (field.options ?? {}) as Record<string, unknown>
  return { ...field, options: { ...options, ...extra } }
}

/** Marks a field (or named type) a shared builder made, and the capability it is when it is one. */
export function builtBy<T extends WithOptions>(
  builder: SharedBuilder,
  field: T,
  capability?: CapabilityId,
  role?: TextRole,
): T & { options: Record<string, unknown> } {
  const options = (field.options ?? {}) as Record<string, unknown>
  return {
    ...field,
    options: stampProvenance(
      { ...options, ...(capability ? { capability } : {}), ...(role ? { textRole: role } : {}) },
      {
        builder,
        ...(capability ? { capability } : {}),
        ...(role ? { role } : {}),
        ...(field.name ? { name: field.name } : {}),
      },
    ),
  }
}

/** Options a shared builder hands out as a fragment, such as Adjust picture's `framing(key)`. */
export function builtOptions<T extends object>(
  builder: SharedBuilder,
  options: T,
  capability?: CapabilityId,
): T {
  return stampProvenance(
    { ...options, ...(capability ? { capability } : {}) },
    { builder, ...(capability ? { capability } : {}) },
  )
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
