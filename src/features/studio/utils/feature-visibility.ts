import type { NewDocumentOptionsResolver } from 'sanity'

import { FEATURE_NAMES, type FeatureName, type Features, siteProfile } from '@/config/profile'

/**
 * Document types each feature owns, by schema name. Turning a feature off hides these from the
 * desk and the "New document" menu; the types stay registered (the profile controls visibility,
 * not the schema). `team` hides the Team list and the member documents; `teamProfiles` only changes
 * which of a member's fields show and whether they have pages, so it owns no document type.
 */
export const FEATURE_DOCUMENT_TYPES: Partial<Record<FeatureName, readonly string[]>> = {
  blog: ['post', 'author', 'category'],
  forms: ['form', 'enquiry'],
  experiments: ['experiment'],
  pricing: ['stripePrice'],
  team: ['team', 'teamMember'],
  events: ['event', 'eventCategory'],
}

/** The document types to hide for a set of feature switches. */
export function hiddenDocumentTypes(features: Features): Set<string> {
  const hidden = new Set<string>()
  for (const name of FEATURE_NAMES) {
    if (!features[name]) FEATURE_DOCUMENT_TYPES[name]?.forEach((type) => hidden.add(type))
  }
  return hidden
}

const hidden = hiddenDocumentTypes(siteProfile.features)

/** Whether the desk should list this document type (or desk item id) for the current profile. */
export const isTypeVisible = (type: string, hiddenTypes: ReadonlySet<string> = hidden) =>
  !hiddenTypes.has(type)

/** Keeps document types of disabled features out of the global "New document" menu. */
export const hideDisabledFromNewMenu: NewDocumentOptionsResolver = (prev, { creationContext }) =>
  creationContext.type === 'global' ? prev.filter((item) => isTypeVisible(item.templateId)) : prev
