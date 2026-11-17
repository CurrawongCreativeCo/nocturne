import type { ObjectInputProps } from 'sanity'

import { LINK_DESIGN_SUMMARY } from '@/lib/sanity/link-design-summary'

import { DesignSummaryInput } from './design-summary-input'

/**
 * A Link list link's Appearance: the shared design summary (design-summary-input.tsx) with the Link
 * list's own words and groups (lib/sanity/link-design-summary.ts). The link's schema sets
 * `options.designSummary: LINK_DESIGN_SUMMARY`, which with-preset-picker routes to the shared input;
 * this keeps the component under its old name.
 */
export function LinkDesignSummaryInput(props: ObjectInputProps) {
  return <DesignSummaryInput {...props} summary={LINK_DESIGN_SUMMARY} />
}
