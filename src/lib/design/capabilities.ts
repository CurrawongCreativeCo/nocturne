/**
 * The design capability contract (task 275; README, "Design capability contract"): the shared design
 * abilities, the content sources and the policy each section, slot block and listing declares.
 *
 * Three things are kept apart:
 *   - policy: what a component should offer, declared with `declareCapabilities` on its schema. It
 *     never switches anything on;
 *   - availability: what it offers today, never written down. It is worked out from the schema's
 *     markers (lib/sanity/schema/capability-marker.ts) and registered evidence;
 *   - evidence: a render target and a probe per adoption (capability-evidence.ts), which a test runs.
 *
 * Site-safe: no React and no Studio imports, so schemas, scripts and tests all read the same list.
 */

/** Where a capability's setting lives. */
export const SCOPES = ['site', 'section', 'card', 'item'] as const
export type Scope = (typeof SCOPES)[number]

/** The kinds of text a component draws, which the text roles (and the section header) style. */
export const TEXT_ROLES = [
  'eyebrow',
  'heading',
  'intro',
  'title',
  'body',
  'meta',
  'quote',
  'attribution',
  'price',
  'number',
  'label',
  'description',
] as const
export type TextRole = (typeof TEXT_ROLES)[number]

/**
 * The attribute every text role's element carries, so evidence can name the one element a role styles.
 * A role's evidence must target this selector: a broader one (a whole card) would pass when the wrong
 * element changes, which is how crossed wiring went unnoticed (`evidenceProblems`).
 */
export const TEXT_ROLE_ATTRIBUTE = 'data-text-role'
export const textRoleTarget = (role: TextRole) => `[${TEXT_ROLE_ATTRIBUTE}="${role}"]`

/** A build plan task, by number. */
export type TaskNumber = number

export interface CapabilityDefinition {
  id: string
  title: string
  /** What it does, in one line. */
  does: string
  /** The one task that owns the capability. A component's pair may close in another (`closingTask`). */
  owner: TaskNumber
  scopes: readonly Scope[]
  /** The text roles it styles, for capabilities about text. */
  roles?: readonly TextRole[]
}

export const CAPABILITIES = [
  {
    id: 'surface',
    title: 'Surface and border',
    does: 'The fill, border and corners of a card or other surface',
    owner: 156,
    scopes: ['section', 'card', 'item'],
  },
  {
    id: 'text',
    title: 'Text roles',
    does: 'Size, weight and colour for each kind of text, with safe highlights',
    owner: 156,
    scopes: ['site', 'section', 'card', 'item'],
    roles: TEXT_ROLES,
  },
  {
    id: 'header',
    title: 'Section header',
    does: 'One shared eyebrow, heading and intro at the top of a section',
    owner: 156,
    scopes: ['section'],
    roles: ['eyebrow', 'heading', 'intro'],
  },
  {
    id: 'mark',
    title: 'Decorative mark',
    does: 'A faint word, picture or icon behind a section, card or item',
    owner: 156,
    scopes: ['section', 'card', 'item'],
  },
  {
    id: 'depth',
    title: 'Depth and glow',
    does: 'A shadow level and a glow on a card or other box',
    owner: 146,
    scopes: ['site', 'section', 'card', 'item'],
  },
  {
    id: 'icon',
    title: 'Icon',
    does: 'An icon from the shared set, in a shared container',
    owner: 158,
    scopes: ['section', 'card', 'item'],
  },
  {
    id: 'action',
    title: 'Action indicator',
    does: 'The arrow on a link that covers a whole card, with its states and motion',
    owner: 137,
    scopes: ['card', 'item'],
  },
  {
    id: 'framing',
    title: 'Picture framing',
    does: 'Adjust picture: a picture cropped to the shape the site draws it in',
    owner: 177,
    scopes: ['section', 'card', 'item'],
  },
  {
    id: 'pictureDepth',
    title: 'Picture depth',
    does: 'A shadow and glow on a framed picture',
    owner: 147,
    scopes: ['section', 'card', 'item'],
  },
  {
    id: 'overlay',
    title: 'Overlay',
    does: 'A wash or gradient over a picture',
    owner: 157,
    scopes: ['section'],
  },
  {
    id: 'glass',
    title: 'Glass',
    does: 'A glass or solid panel behind content',
    owner: 159,
    scopes: ['site', 'section', 'card'],
  },
  {
    id: 'divider',
    title: 'Divider',
    does: 'A decorative divider inside a section',
    owner: 151,
    scopes: ['section', 'item'],
  },
  {
    id: 'edge',
    title: 'Section edge',
    does: 'A shaped edge between a section and the next (built by task 83)',
    owner: 151,
    scopes: ['section'],
  },
  {
    id: 'motion',
    title: 'Motion',
    does: 'Animation presets for a section and its parts (built by tasks 84 and 85)',
    owner: 217,
    scopes: ['site', 'section', 'item'],
  },
  {
    id: 'slots',
    title: 'Slots',
    does: 'Typed places where a section takes one approved block (built by tasks 219 and 193)',
    owner: 219,
    scopes: ['section'],
  },
] as const satisfies readonly CapabilityDefinition[]

export type CapabilityId = (typeof CAPABILITIES)[number]['id']

export const CAPABILITY_IDS: readonly CapabilityId[] = CAPABILITIES.map(({ id }) => id)

export function capabilityById(id: CapabilityId): CapabilityDefinition {
  const found = CAPABILITIES.find((capability) => capability.id === id)
  if (!found) throw new Error(`Unknown design capability "${id}".`)
  return found
}

export interface ContentSourceDefinition {
  id: string
  title: string
  does: string
  /** The component type it feeds; none for one that exists only in the plan (the cards family). */
  component?: string
  owner: TaskNumber
  /** What must be approved or configured before it can be used. */
  gate?: string
}

/**
 * Where a component's content can come from. Recorded apart from design capabilities, and never a
 * stand-in for one. Generic tabs are deliberately not here (task 279 excludes them).
 */
export const CONTENT_SOURCES = [
  {
    id: 'testimonials.manual',
    title: 'Written in Studio',
    does: 'Quotes typed into the section',
    component: 'testimonials',
    owner: 156,
  },
  {
    id: 'testimonials.google',
    title: 'Google reviews',
    does: 'Reviews imported from a verified Google Business Profile, as drafts with provenance',
    component: 'testimonials',
    owner: 277,
    gate: 'Task 277 Phase 1 decision record and the owner’s approval. No Google Cloud setup is approved',
  },
  {
    id: 'location.addressCard',
    title: 'Address card',
    does: 'The business address, hours and contact details on a card',
    component: 'location',
    owner: 278,
  },
  {
    id: 'location.directionsLink',
    title: 'Directions link',
    does: 'Opens Google Maps directions to the address',
    component: 'location',
    owner: 278,
  },
  {
    id: 'location.clickToLoadEmbed',
    title: 'Click-to-load map',
    does: 'A Google map from the address, loaded only when a visitor asks for it',
    component: 'location',
    owner: 278,
  },
  {
    id: 'location.placeIdEmbed',
    title: 'Place ID map',
    does: 'A Maps Embed API map for a Google Place ID',
    component: 'location',
    owner: 278,
    gate: 'A configured Maps Embed API key in a client-owned Google Cloud project. No project, key or billing is approved',
  },
  {
    id: 'cards.written',
    title: 'Written here',
    does: 'Cards typed into the section',
    owner: 276,
  },
  {
    id: 'cards.services',
    title: 'Services',
    does: 'Cards listed from Service documents',
    owner: 276,
  },
  {
    id: 'cards.locations',
    title: 'Locations',
    does: 'Cards listed from Location documents',
    owner: 276,
  },
  {
    id: 'cards.posts',
    title: 'Recent posts',
    does: 'Cards listed from the newest posts',
    owner: 276,
  },
] as const satisfies readonly ContentSourceDefinition[]

export type ContentSourceId = (typeof CONTENT_SOURCES)[number]['id']

/**
 * The shared builders a design field may be made by (judged by how a field was built, never by its
 * name), each with the one module allowed to stamp its provenance (builder-provenance.ts). A field in a
 * Design group made any other way needs a reviewed exception (capability-exceptions.ts).
 */
export const SHARED_BUILDERS = {
  sectionStyle: 'src/lib/sanity/schema/section-style.ts',
  surfaceFields: 'src/lib/sanity/schema/surface-design.ts',
  textRoleField: 'src/lib/sanity/schema/surface-design.ts',
  iconDesignFields: 'src/lib/sanity/schema/surface-design.ts',
  actionFields: 'src/lib/sanity/schema/surface-design.ts',
  depthFields: 'src/lib/sanity/schema/surface-design.ts',
  pictureDepthFields: 'src/lib/sanity/schema/surface-design.ts',
  itemAppearanceField: 'src/lib/sanity/schema/item-appearance.ts',
  itemStyleField: 'src/lib/sanity/schema/item-appearance.ts',
  badgeIconField: 'src/lib/sanity/schema/badge-icon-field.ts',
  framing: 'src/lib/sanity/schema/image-framing-option.ts',
  decorativeDivider: 'src/lib/sanity/schema/decorative-divider.ts',
  decorativeMark: 'src/lib/sanity/schema/decorative-mark.ts',
  slotField: 'src/features/pages/slots/slot-field.ts',
  imageDesign: 'src/lib/sanity/schema/image-design.ts',
  avatarDesignField: 'src/lib/sanity/schema/avatar-design.ts',
} as const

export type SharedBuilder = keyof typeof SHARED_BUILDERS

/** The Studio's capability group names, in order, before the section style's own groups. */
export const DESIGN_GROUPS = [
  'Cards',
  'Text',
  'Icons',
  'Actions',
  'Pictures',
  'Decoration',
] as const

/**
 * Parts of the site the contract doesn't cover yet: not sections, slot blocks or listings, so nothing
 * declares them and the manifest says nothing about them. `tasks` are the tasks that will implement a
 * capability on the part (each capability's own closing task is set when the part is declared).
 * `declaredBy` is the task that brings the part into the contract, which is not ownership of its
 * eventual design capabilities. Every part has one or the other (`futureCoverageProblems`).
 */
export interface FutureCoverage {
  part: string
  needs: readonly CapabilityId[]
  tasks: readonly TaskNumber[]
  note?: string
  declaredBy?: TaskNumber
}

export const FUTURE_COVERAGE = [
  { part: 'Site header', needs: ['glass'], tasks: [159] },
  { part: 'Mobile drawer', needs: ['glass'], tasks: [7], note: 'Optional quick actions' },
  {
    part: 'Booking facade',
    needs: ['surface', 'depth'],
    tasks: [148],
    note: 'Waits for task 95, which builds it',
  },
  { part: 'Event pages', needs: ['framing', 'divider'], tasks: [177, 151] },
  { part: 'Blog post page', needs: ['framing'], tasks: [177] },
  { part: 'Location pages', needs: ['surface', 'text'], tasks: [278] },
] as const satisfies readonly FutureCoverage[]

/** The reason a generated declaration starts with. The checks reject it, so a person must review. */
export const NOT_REVIEWED = 'Not reviewed yet'

// ---------------------------------------------------------------------------------------------------
// Declarations (policy)

/**
 * When a conditional policy applies. It describes the component (its anatomy, a layout or a stored
 * setting), never whether a task has started.
 */
export interface Trigger {
  kind: 'anatomy' | 'variant' | 'setting'
  /** As an editor would see it: "The layout is Cards". */
  when: string
  /** The stored field the condition reads, so the manifest can say whether it can be met today. */
  path?: string
}

/**
 * A layout either applies, is not applicable with a reason, or applies to only some text roles: it draws
 * those (`roles`, a non-empty strict subset of the policy's) and the rest are Not applicable there, with
 * the reason. One passing role never verifies another, so a layout that ignores a role must say so.
 */
export type LayoutRule =
  'applies' | { notApplicable: string } | { roles: readonly TextRole[]; reason: string }

interface ScopedPolicy<Layout extends string> {
  scope: Scope | readonly Scope[]
  /** A named part of the component, needed only when two policies share a scope. */
  part?: string
  /**
   * Every layout, each applying or not applicable with a reason. Left out, the policy applies to
   * every layout, including any added later.
   */
  layouts?: Readonly<Record<Layout, LayoutRule>>
  /** For text roles and the section header: which roles. */
  roles?: readonly TextRole[]
  /** The task that implements it here, when that isn't the capability's owner. */
  closingTask?: TaskNumber
  note?: string
}

export interface RequiredPolicy<Layout extends string = string> extends ScopedPolicy<Layout> {
  policy: 'required'
}

export interface ConditionalPolicy<Layout extends string = string> extends ScopedPolicy<Layout> {
  policy: 'conditional'
  trigger: Trigger
}

export interface NotApplicablePolicy {
  policy: 'notApplicable'
  reason: string
}

export type ScopePolicy<Layout extends string = string> =
  RequiredPolicy<Layout> | ConditionalPolicy<Layout>

/** One entry per capability: not applicable, one scoped policy, or several (one per scope or part). */
export type CapabilityPolicy<Layout extends string = string> =
  | NotApplicablePolicy
  | ScopePolicy<Layout>
  | readonly [ScopePolicy<Layout>, ...ScopePolicy<Layout>[]]

export type CapabilityPolicies<Layout extends string = string> = Readonly<
  Record<CapabilityId, CapabilityPolicy<Layout>>
>

export interface DesignCapabilityDeclaration {
  readonly capabilities: CapabilityPolicies
  readonly contentSources: readonly ContentSourceId[]
}

/**
 * A component's declaration: one entry for every capability, and its content sources. Give the
 * component's layouts as the type argument, so a policy that names layouts must name them all:
 *
 *   declareCapabilities<HeroLayout>({ surface: notApplicable('…'), … })
 */
export function declareCapabilities<const Layout extends string = never>(
  capabilities: CapabilityPolicies<Layout>,
  { contentSources = [] }: { contentSources?: readonly ContentSourceId[] } = {},
): DesignCapabilityDeclaration {
  return { capabilities, contentSources }
}

export const notApplicable = (reason: string): NotApplicablePolicy => ({
  policy: 'notApplicable',
  reason,
})
