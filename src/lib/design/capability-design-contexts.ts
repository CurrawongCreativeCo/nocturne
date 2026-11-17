/**
 * Registered design-control contexts (task 275 correction, I6; README, "Design capability contract"): a
 * place in a component's schema that holds design controls although nothing in the schema says so by
 * itself, such as a listing's settings. Every field inside one must be made by a shared builder or be in
 * the exception register, however it is named or typed, exactly as in the Design group.
 *
 * A context is a decision about where design lives, so a row needs a reviewer and a date like an
 * exception does. The Design group, an object inside it and an object that sets `options.designSummary`
 * are contexts already and need no row.
 */
export interface DesignContext {
  component: string
  /** The manifest path of the object. Its own fields, at any depth, are the context. */
  path: string
  why: string
  reviewer: string
  /** When the reviewer approved it (YYYY-MM-DD). */
  reviewed: string
}

export const DESIGN_CONTEXTS: readonly DesignContext[] = [
  {
    component: 'blogPostCards',
    path: 'settings',
    why: 'A listing has no section to hold its design: the post cards’ controls live in Blog settings, a document.',
    reviewer: 'owner',
    reviewed: '2026-11-07',
  },
  {
    component: 'siteFooter',
    path: 'navigation.footerIconDesign',
    why: 'The footer has no section to hold its design: its icon controls live in Navigation, a document, as an agency-only Icons box.',
    reviewer: 'owner',
    reviewed: '2026-11-08',
  },
]
