import {
  textRoleTarget,
  type CapabilityId,
  type ContentSourceId,
  type Scope,
  type TextRole,
} from './capabilities'

/**
 * Evidence (task 275; README, "Design capability contract"): each registered adoption of a design
 * capability or content source by a component. Site-safe data only.
 *
 * An entry claims nothing by itself. A layout is verified only when all four hold:
 *   1. the schema offers the marked `field` for that layout and state (schema-capabilities.ts);
 *   2. the component's declared policy applies there;
 *   3. this entry registers a render `target` for it;
 *   4. its probe case passes: one shared harness renders the component with `base`, then with
 *      `base` and `probe`, and the target must exist both times, keep its committed snapshot with
 *      the capability unset, and change with the probe (src/app/design-capability-evidence.test.tsx).
 * A missing or unchanged target fails the case, so the claim can't stand.
 */

/** Stored values by dotted path (`links.0.design.border`). `null` removes the value: unset. */
export type Patch = Readonly<Record<string, unknown>>

interface EvidenceBase {
  /** Stable and unique: names the harness case (`linkList.surface.card@stacked`). */
  id: string
  component: string
  /** The layouts it covers. Required for a component with layouts; each one is its own case. */
  layouts?: readonly string[]
  /** The schema field the probe sets, as a manifest path (`style.panel`, `links[].design.border`). */
  field: string
  /**
   * The resolvers the renderer reaches the target through, each checked to exist. The harness
   * disconnects them all at once (replaying what they returned with the field unset), and the probe
   * must then stop changing the target: the claim is the whole path, not just an export that exists.
   */
  resolvers: readonly { module: string; export: string }[]
  /** The file or folder that draws the target, checked to exist. */
  render: string
  /** Stored values both renders start from. `$picture` stands for the fixtures' picture. */
  base?: Patch
  /** What the probe sets on top of `base`. */
  probe: Patch
}

export interface CapabilityEvidence extends EvidenceBase {
  capability: CapabilityId
  scope: Scope
  part?: string
  /**
   * The text role it proves, for a policy that names roles (text, header): one role per entry, and the
   * probed field must be the one the builder stamped for that role. A role is verified only by its own
   * entry, so a passing sibling never verifies it.
   */
  role?: TextRole
  /** A CSS selector into the component's output: the element the capability renders on. */
  target: string
  /**
   * What the probe must do to the target: change its own attributes, change anything inside it, or draw
   * it (`appears`: the element is absent with the field unset).
   */
  change: 'attributes' | 'content' | 'appears'
  /**
   * Tests that measure what the probe can't: where a layout puts something at each width, which only a
   * browser can show. Checked to exist and not be switched off (`sourceTestProblems`), and required for
   * any evidence of a `placement` part: the harness proves that the block is drawn in the wrapper the
   * layout gives it, the measurements prove where that wrapper is.
   */
  measured?: readonly SourceTests[]
}

/** Test cases written for one content source, by file and by name. */
export interface SourceTests {
  file: string
  /** Each is the title (or the start of the title) of a test in the file. */
  cases: readonly string[]
}

/**
 * A content source's evidence. The whole-component probe proves nothing about one source of several,
 * so a source is verified by tests written for it (`tests`): what it draws from what is stored, what it
 * draws nothing without, and that disconnecting its own resolver removes it. The harness checks the
 * named cases exist and aren't skipped; `npm run check` runs them.
 */
export interface SourceEvidence extends EvidenceBase {
  source: ContentSourceId
  tests: readonly SourceTests[]
}

export type Evidence = CapabilityEvidence | SourceEvidence

export const isCapabilityEvidence = (entry: Evidence): entry is CapabilityEvidence =>
  'capability' in entry

/** The fixtures' picture, filled in by the harness. */
export const PICTURE = {
  _type: 'image',
  alt: 'Fixture picture',
  asset: { _type: 'reference', _ref: '$picture' },
} as const

const CROPPED = { _type: 'sanity.imageCrop', top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 }

// ---------------------------------------------------------------------------------------------------
// The shared section style, drawn by SectionFrame

const SECTION_CONTAINER = 'section > :last-child'

type FrameCapability = 'overlay' | 'glass' | 'edge' | 'motion' | 'mark'

const FRAME: Record<FrameCapability, Omit<CapabilityEvidence, 'id' | 'component' | 'layouts'>> = {
  // A mark draws nothing until it is chosen, so the claim is that the probe draws it, from SectionFrame, on
  // every section whose policy allows one (the unit test of the schema, renderer and policy agreeing is in
  // src/app/design-capabilities.test.ts). Words stand for the kinds; the Testimonials entries cover each.
  mark: {
    capability: 'mark',
    scope: 'section',
    field: 'style.mark',
    resolvers: [
      { module: '@/lib/sanity/decorative-mark-options', export: 'resolveDecorativeMark' },
    ],
    render: 'src/components/ui/section-frame.tsx',
    target: '[data-decorative-mark="section"]',
    change: 'appears',
    probe: { 'style.mark.kind': 'text', 'style.mark.text': 'Thanks' },
  },
  overlay: {
    capability: 'overlay',
    scope: 'section',
    field: 'style.overlay',
    resolvers: [{ module: '@/components/ui/section-style', export: 'resolveSectionStyle' }],
    render: 'src/components/ui/section-background.tsx',
    target: '[data-section-background]',
    change: 'content',
    base: { 'style.image': PICTURE },
    probe: { 'style.overlay': 'strong' },
  },
  glass: {
    capability: 'glass',
    scope: 'section',
    field: 'style.panel',
    resolvers: [{ module: '@/lib/sanity/section-panel', export: 'resolveSectionPanel' }],
    render: 'src/components/ui/section-frame.tsx',
    target: SECTION_CONTAINER,
    change: 'attributes',
    probe: { 'style.panel': 'solid' },
  },
  edge: {
    capability: 'edge',
    scope: 'section',
    field: 'style.edge',
    // SectionFrame draws the edge's frame from the resolved style; SectionRenderer pulls the next
    // section up under it through resolveEdge.
    resolvers: [
      { module: '@/components/ui/section-style', export: 'resolveSectionStyle' },
      { module: '@/components/ui/section-style', export: 'resolveEdge' },
    ],
    render: 'src/components/ui/section-frame.tsx',
    // The element directly around the section: the edge's frame once there is one.
    target: ':has(> section)',
    change: 'attributes',
    probe: { 'style.edge': 'wave' },
  },
  motion: {
    capability: 'motion',
    scope: 'section',
    field: 'style.motion',
    resolvers: [{ module: '@/components/ui/section-style', export: 'sectionMotion' }],
    render: 'src/components/ui/section-frame.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    // Unlike every section's own default (Fade up, Staggered or None).
    probe: { 'style.motion': 'fade' },
  },
}

/** The section style's capabilities on one component, for the layouts each covers. */
function frameEvidence(
  component: string,
  covers: Partial<Record<FrameCapability, readonly string[] | true>>,
): CapabilityEvidence[] {
  return (Object.entries(covers) as [FrameCapability, readonly string[] | true][]).map(
    ([capability, layouts]) => ({
      id: `${component}.${capability}.section`,
      component,
      ...(layouts === true ? {} : { layouts }),
      ...FRAME[capability],
    }),
  )
}

// ---------------------------------------------------------------------------------------------------
// A card family's shared design (task 156): surface, text roles, section header and marks

interface CardFamilyEvidence {
  component: string
  layouts?: readonly string[]
  /** The file that draws the cards, checked to exist. */
  render: string
  /** One card's element, which the surface and the card mark are found on. */
  cardTarget: string
  /** The stored content every case starts from: it must draw every role and the header. */
  base: Patch
  /** The text roles the cards draw, each proven on its own element. */
  roles: readonly TextRole[]
  /** The header roles, drawn by SectionHeader. */
  headerRoles?: readonly TextRole[]
  /** The file that draws them, when a section composes them itself (Image + text's intro is its body). */
  headerRender?: string
  /** The array whose members have their own Appearance, and which member the probes set. */
  item?: { array: string; index?: number }
  /** The Cards box's name on the section. */
  box?: string
  /** Where the family has no card of its own at a layout, the layouts it does (surface and marks). */
  cardLayouts?: readonly string[]
  /** The layouts its text roles draw on, when not all of them. */
  roleLayouts?: readonly string[]
  /**
   * A look that is a setting, not a layout (FAQ's Divided list and Cards): names these entries, so each look
   * has independent evidence for what it draws. `base` sets the look.
   */
  look?: string
  /** What this call proves. Default: everything. A look that draws no card proves only its text. */
  parts?: readonly ('surface' | 'text' | 'header' | 'mark')[]
  /** Also proves depth and glow (task 146): opt in once the family draws it through resolveCardDepth. */
  depth?: boolean
}

/**
 * The icon container's evidence (task 158): a set icon is drawn in `data-icon-shape`, which the section's
 * Icons box changes. `base` gives the content a set icon to draw; the probe picks a container shape.
 */
function iconContainerEvidence(config: {
  component: string
  layouts?: readonly string[]
  render: string
  base: Patch
  scope?: 'card' | 'section'
  box?: string
  target?: string
  /** `appears` where nothing is drawn around the icon until a container is chosen. */
  change?: 'attributes' | 'appears'
  /** The shape the probe picks, when the content already draws a circle. */
  shape?: string
}): CapabilityEvidence {
  const box = config.box ?? 'iconDesign'
  return {
    id: `${config.component}.icon.${config.scope ?? 'card'}`,
    component: config.component,
    ...(config.layouts ? { layouts: config.layouts } : {}),
    capability: 'icon',
    scope: config.scope ?? 'card',
    field: `${box}.iconShape`,
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: config.render,
    base: config.base,
    target: config.target ?? '[data-icon-shape]',
    change: config.change ?? 'attributes',
    probe: { [`${box}.iconShape`]: config.shape ?? 'circle' },
  }
}

/**
 * The evidence of a card family's shared design: the same cases for every family, so a role, a part and a
 * scope are each proven on their own. A role's target is that role's own element (data-text-role), the
 * surface's the card, a mark's the mark's own box, and the item scope sets the item's Appearance first.
 */
function cardFamilyEvidence(config: CardFamilyEvidence): CapabilityEvidence[] {
  const {
    component,
    layouts,
    render,
    cardTarget,
    base,
    roles,
    item,
    cardLayouts,
    roleLayouts,
    look,
  } = config
  const box = config.box ?? 'cardDesign'
  const proves = (part: 'surface' | 'text' | 'header' | 'mark') =>
    !config.parts || config.parts.includes(part)
  const named = look ? `.${look}` : ''
  const index = item?.index ?? 0
  const scopes = item ? (['card', 'item'] as const) : (['card'] as const)
  const pathOf = (scope: 'card' | 'item', field: string) =>
    scope === 'card' ? `${box}.${field}` : `${item?.array}[].design.${field}`
  const probeOf = (scope: 'card' | 'item', field: string) =>
    scope === 'card' ? `${box}.${field}` : `${item?.array}.${String(index)}.design.${field}`
  const baseOf = (scope: 'card' | 'item' | 'section'): Patch =>
    scope !== 'item'
      ? base
      : { ...base, [`${item?.array}.${String(index)}.design.appearance`]: 'custom' }
  const common = (scope: 'card' | 'item' | 'section', covers: readonly string[] | undefined) => ({
    component,
    ...(covers ? { layouts: covers } : {}),
    scope,
    render,
    base: baseOf(scope),
  })
  return [
    ...(proves('surface') ? scopes : []).map((scope): CapabilityEvidence => ({
      id: `${component}.surface.${scope}${named}`,
      ...common(scope, cardLayouts ?? layouts),
      capability: 'surface',
      field: pathOf(scope, 'border'),
      resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
      target: cardTarget,
      change: 'attributes',
      probe: { [probeOf(scope, 'border')]: 'thick' },
    })),
    ...(proves('text') ? scopes : []).flatMap((scope) =>
      roles.map((role): CapabilityEvidence => ({
        id: `${component}.text.${scope}${named}.${role}`,
        ...common(scope, roleLayouts ?? layouts),
        capability: 'text',
        role,
        field: pathOf(scope, role),
        resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
        target: textRoleTarget(role),
        change: 'attributes',
        probe: { [probeOf(scope, `${role}.size`)]: 'large' },
      })),
    ),
    ...(proves('header') ? (config.headerRoles ?? []) : []).map((role): CapabilityEvidence => ({
      id: `${component}.header.section.${role}`,
      ...common('section', layouts),
      capability: 'header',
      role,
      field: `headerDesign.${role}`,
      resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
      render: config.headerRender ?? 'src/components/ui/section-header.tsx',
      target: textRoleTarget(role),
      change: 'attributes',
      probe: { [`headerDesign.${role}.size`]: 'large' },
    })),
    ...(config.depth ? scopes : []).map((scope): CapabilityEvidence => ({
      id: `${component}.depth.${scope}${named}`,
      ...common(scope, cardLayouts ?? layouts),
      capability: 'depth',
      field: pathOf(scope, 'shadow'),
      resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveCardDepth' }],
      target: cardTarget,
      change: 'attributes',
      probe: { [probeOf(scope, 'shadow')]: 'floating' },
    })),
    ...(proves('mark') ? scopes : []).map((scope): CapabilityEvidence => ({
      id: `${component}.mark.${scope}${named}`,
      ...common(scope, cardLayouts ?? layouts),
      capability: 'mark',
      field: pathOf(scope, 'mark'),
      resolvers: [
        { module: '@/lib/sanity/decorative-mark-options', export: 'resolveDecorativeMark' },
      ],
      render: 'src/components/ui/decorative-mark.tsx',
      target: `[data-decorative-mark="${scope}"]`,
      change: 'appears',
      probe: {
        [probeOf(scope, 'mark.kind')]: 'text',
        [probeOf(scope, 'mark.text')]: 'Thanks',
      },
    })),
  ]
}

// ---------------------------------------------------------------------------------------------------
// Slots

const STATS_BAR = [
  {
    _key: 'probe-stats',
    _type: 'statsBar',
    items: [
      { _key: 's1', _type: 'statItem', value: '12', label: 'Years' },
      { _key: 's2', _type: 'statItem', value: '300', label: 'Clients' },
    ],
  },
]
const SLOT_VIDEO = [
  {
    _key: 'probe-video',
    _type: 'slotVideo',
    title: 'Fixture video',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    poster: PICTURE,
  },
]
const SLOT_IMAGE = [{ _key: 'probe-image', _type: 'slotImage', image: PICTURE }]

// Slot blocks are proven inside every host the registry allows them in (ContractComponent.hosts): the
// block is built from `base` and `probe`, which are relative to the block, and placed in the host's slot.
const slotBlockEvidence: CapabilityEvidence[] = [
  {
    id: 'badgeRow.icon.item',
    component: 'badgeRow',
    capability: 'icon',
    scope: 'item',
    field: 'badges[].icon',
    resolvers: [{ module: '@/components/ui/badge-icon', export: 'BadgeIcon' }],
    render: 'src/components/ui/badge-row.tsx',
    target: '[data-badge-row] li',
    change: 'content',
    base: { badges: [{ _key: 'b1', _type: 'badge', label: 'Locally owned' }] },
    probe: { 'badges.0.icon': 'star' },
  },
  {
    // The container around the icon: absent until the block's Icons box chooses a shape.
    id: 'badgeRow.icon.section',
    component: 'badgeRow',
    capability: 'icon',
    scope: 'section',
    field: 'iconDesign.iconShape',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: 'src/components/ui/badge-row.tsx',
    target: '[data-badge-row] [data-icon-shape]',
    change: 'appears',
    base: {
      badges: [{ _key: 'b1', _type: 'badge', label: 'Locally owned', icon: 'star' }],
    },
    probe: { 'iconDesign.iconShape': 'circle' },
  },
]

// ---------------------------------------------------------------------------------------------------
// The Link list

const LINK_LIST = 'src/features/pages/components/sections/link-list'
const LINK_DESIGN = '@/features/pages/components/sections/link-list/link-design'
// Every link item (the list's other <ul>s hold categories and social icons).
const LINK_ITEMS = 'li[data-track-event="link_click"]'

const link = (key: string, thumbnail: boolean) => ({
  _key: key,
  _type: 'linkListItem',
  eyebrow: 'Eyebrow',
  label: 'Fixture link',
  description: 'A short description.',
  icon: 'phone',
  link: { _type: 'link', linkType: 'external', url: `https://example.com/${key}` },
  ...(thumbnail ? { thumbnail: PICTURE } : {}),
})

const withoutIcon = ({ icon: _icon, ...rest }: ReturnType<typeof link>) => rest

/** A profile, social links and two links, with thumbnails (or without, so icons show). */
const linkListContent = (thumbnails: boolean): Patch => ({
  profile: {
    name: 'Fixture name',
    bio: 'A short bio.',
    categories: ['One', 'Two'],
    image: PICTURE,
  },
  socialSource: 'custom',
  socialLinks: [
    { _key: 's1', _type: 'socialLink', platform: 'instagram', url: 'https://instagram.com/x' },
  ],
  links: [link('l1', thumbnails), link('l2', thumbnails)],
})
const CUSTOMISED = { 'links.0.design.appearance': 'custom' }

const TESTIMONIALS = 'src/features/pages/components/sections/testimonials'
const TESTIMONIAL_LAYOUTS = ['grid', 'slider']
/** One quote drawing every text role, under a header drawing every header role. */
const TESTIMONIAL_CONTENT: Patch = {
  title: 'Fixture title',
  eyebrow: 'Eyebrow',
  intro: 'A short intro.',
  items: [
    {
      _key: 'q1',
      _type: 'testimonial',
      quote: 'Kind words.',
      name: 'Fixture Person',
      role: 'Owner',
      attribution: 'Client since 2019',
      source: 'client-feedback',
      date: '2026-03-12',
    },
  ],
}

const MARK_MEASURED = {
  section: 'a section mark sits behind its content, clipped to its section, with no layout shift',
  card: 'a card mark sits behind its text, clipped to its card, with no layout shift',
} as const

const WITH_CARDS = ['stacked', 'cards', 'compact']
/** The text roles each layout draws: Compact shows the label only. */
const TEXT_ROLES_DRAWN = [
  { role: 'eyebrow', layouts: ['stacked', 'cards', 'editorial'] },
  { role: 'label', layouts: ['stacked', 'cards', 'editorial', 'compact'] },
  { role: 'description', layouts: ['stacked', 'cards', 'editorial'] },
] as const
const WITH_ARROWS = ['stacked', 'cards', 'editorial']
const ALL_LINK_LIST = ['stacked', 'cards', 'editorial', 'compact']
const DIVIDER_POSITIONS = ['afterCategories', 'afterProfile', 'aboveSocial', 'belowSocial'] as const

// Glass rows draw today (glass-row.tsx), but `rowStyle` is set inline rather than by a shared glass
// builder, so it carries no glass marker and its evidence would be refused: the pair stays pending
// until task 159's single glass system.
const linkListEvidence: CapabilityEvidence[] = [
  {
    id: 'linkList.surface.card',
    component: 'linkList',
    capability: 'surface',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'cardDesign.border',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'cardDesign.border': 'thick' },
  },
  {
    id: 'linkList.surface.item',
    component: 'linkList',
    capability: 'surface',
    scope: 'item',
    layouts: WITH_CARDS,
    field: 'links[].design.border',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.border': 'thick' },
  },
  // Each text role is proven on its own, on the layouts that draw it (Compact draws the label only), by
  // probing the field the text style builder made for that role: one passing role never verifies another.
  ...TEXT_ROLES_DRAWN.flatMap(({ role, layouts }) =>
    (['card', 'item'] as const).map((scope): CapabilityEvidence => ({
      id: `linkList.text.${scope}.${role}`,
      component: 'linkList',
      capability: 'text',
      scope,
      role,
      layouts,
      field: scope === 'card' ? `cardDesign.${role}` : `links[].design.${role}`,
      resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
      render: LINK_LIST,
      target: textRoleTarget(role),
      change: 'attributes',
      base: scope === 'card' ? linkListContent(true) : { ...linkListContent(true), ...CUSTOMISED },
      probe: {
        [scope === 'card' ? `cardDesign.${role}.size` : `links.0.design.${role}.size`]: 'large',
      },
    })),
  ),
  {
    id: 'linkList.icon.card',
    component: 'linkList',
    capability: 'icon',
    scope: 'card',
    part: 'container',
    layouts: WITH_CARDS,
    field: 'linkDesign.iconShape',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(false),
    probe: { 'linkDesign.iconShape': 'circle' },
  },
  {
    id: 'linkList.icon.item',
    component: 'linkList',
    capability: 'icon',
    scope: 'item',
    part: 'container',
    layouts: WITH_CARDS,
    field: 'links[].design.iconShape',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'iconLook' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(false), ...CUSTOMISED },
    probe: { 'links.0.design.iconShape': 'circle' },
  },
  {
    id: 'linkList.action.card',
    component: 'linkList',
    capability: 'action',
    scope: 'card',
    layouts: WITH_ARROWS,
    field: 'linkDesign.arrowStyle',
    resolvers: [
      // Whether there is an arrow, and which, is the card design; ActionIndicator draws it.
      { module: '@/features/pages/utils/link-card-design', export: 'resolveLinkCardDesign' },
      { module: '@/components/ui/action-indicator', export: 'ActionIndicator' },
    ],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'linkDesign.arrowStyle': 'arrow' },
  },
  {
    id: 'linkList.action.item',
    component: 'linkList',
    capability: 'action',
    scope: 'item',
    layouts: WITH_ARROWS,
    field: 'links[].design.arrowStyle',
    resolvers: [
      // Whether there is an arrow, and which, is the card design; ActionIndicator draws it.
      { module: '@/features/pages/utils/link-card-design', export: 'resolveLinkCardDesign' },
      { module: '@/components/ui/action-indicator', export: 'ActionIndicator' },
    ],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.arrowStyle': 'arrow' },
  },
  {
    id: 'linkList.depth.card',
    component: 'linkList',
    capability: 'depth',
    scope: 'card',
    layouts: WITH_CARDS,
    field: 'depthDesign.linkShadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'depthDesign.linkShadow': 'floating' },
  },
  {
    id: 'linkList.depth.item',
    component: 'linkList',
    capability: 'depth',
    scope: 'item',
    layouts: WITH_CARDS,
    field: 'links[].design.shadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: { ...linkListContent(true), ...CUSTOMISED },
    probe: { 'links.0.design.shadow': 'floating' },
  },
  {
    id: 'linkList.pictureDepth.section',
    component: 'linkList',
    capability: 'pictureDepth',
    scope: 'section',
    layouts: ALL_LINK_LIST,
    field: 'depthDesign.pictureShadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveDepth' }],
    render: `${LINK_LIST}/profile.tsx`,
    target: '[data-profile-image]',
    change: 'attributes',
    base: linkListContent(true),
    probe: { 'depthDesign.pictureShadow': 'floating' },
  },
  {
    id: 'linkList.framing.profile',
    component: 'linkList',
    capability: 'framing',
    scope: 'section',
    part: 'profile',
    layouts: ALL_LINK_LIST,
    field: 'profile.image',
    // The profile picture is cropped by the image URL itself (Sanity's crop and hotspot).
    resolvers: [{ module: '@/lib/sanity/image', export: 'urlFor' }],
    render: 'src/components/ui/profile-image.tsx',
    target: '[data-profile-image]',
    change: 'content',
    base: linkListContent(true),
    probe: { 'profile.image.crop': CROPPED },
  },
  {
    id: 'linkList.framing.thumbnail',
    component: 'linkList',
    capability: 'framing',
    scope: 'item',
    part: 'thumbnail',
    layouts: ['stacked', 'cards'],
    field: 'links[].thumbnail',
    resolvers: [{ module: '@/lib/sanity/image-framing', export: 'visibleArea' }],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    base: linkListContent(true),
    probe: { 'links.0.thumbnail.crop': CROPPED },
  },
  {
    id: 'linkList.divider.section',
    component: 'linkList',
    capability: 'divider',
    scope: 'section',
    layouts: ALL_LINK_LIST,
    field: 'dividerDesign.afterProfile',
    resolvers: [{ module: '@/lib/sanity/divider-options', export: 'resolveDivider' }],
    render: 'src/components/ui/decorative-divider.tsx',
    target: SECTION_CONTAINER,
    change: 'content',
    base: linkListContent(true),
    probe: { 'dividerDesign.afterProfile': { _type: 'decorativeDivider', style: 'line' } },
  },
  // Which icon a link shows (its container is the entries above): the stored name decides the drawing.
  {
    id: 'linkList.icon.identity',
    component: 'linkList',
    capability: 'icon',
    scope: 'item',
    part: 'identity',
    layouts: WITH_CARDS,
    field: 'links[].icon',
    // The icon's container is drawn whenever the link has an icon (Cards keeps its box), so the claim is
    // the whole path: the link's icon part, and the icon it draws.
    resolvers: [
      { module: LINK_DESIGN, export: 'LinkIcon' },
      { module: '@/components/ui/badge-icon', export: 'BadgeIcon' },
    ],
    render: LINK_LIST,
    target: LINK_ITEMS,
    change: 'content',
    // No link has an icon with the field unset, so the probe's is the only one drawn: what each resolver
    // returned unset can then be replayed one for one.
    base: {
      ...linkListContent(false),
      links: [link('l1', false), link('l2', false)].map(withoutIcon),
    },
    probe: { 'links.0.icon': 'star' },
  },
  // A divider's centre icon, in each position the Link list draws a divider.
  ...DIVIDER_POSITIONS.map((position): CapabilityEvidence => ({
    id: `linkList.icon.divider.${position}`,
    component: 'linkList',
    capability: 'icon',
    scope: 'section',
    part: `divider.${position}`,
    layouts: ALL_LINK_LIST,
    field: `dividerDesign.${position}.icon`,
    resolvers: [{ module: '@/components/ui/badge-icon', export: 'BadgeIcon' }],
    render: 'src/components/ui/decorative-divider.tsx',
    // The icon is the only drawing inside the divider (its row says it has an icon centre).
    target: '[data-decorative-divider] svg',
    change: 'appears',
    base: {
      ...linkListContent(true),
      // No link draws an icon, so the divider's is the only one: what each resolver returned unset can
      // then be replayed one for one (Compact shows link icons whatever else is there).
      links: [link('l1', true), link('l2', true)].map(withoutIcon),
      [`dividerDesign.${position}.style`]: 'line',
      [`dividerDesign.${position}.centre`]: 'icon',
    },
    probe: { [`dividerDesign.${position}.icon`]: 'star' },
  })),
]

// ---------------------------------------------------------------------------------------------------
// Location's content sources, drawn by the section itself from Business info

const LOCATION = {
  component: 'location',
  render: 'src/features/pages/components/sections/location',
} as const

const MEDIA_TEXT_PLACEMENT_TESTS = 'tests/e2e/media-text-placement.spec.ts'
const LOCATION_SOURCE_TESTS = 'src/features/pages/components/sections/location/sources.test.tsx'
const LOCATION_FACADE_TESTS =
  'src/features/pages/components/sections/location/click-to-load.test.tsx'

const locationSources: SourceEvidence[] = [
  {
    ...LOCATION,
    id: 'location.addressCard',
    source: 'location.addressCard',
    field: 'showHours',
    resolvers: [{ module: '@/lib/location-links', export: 'addressLines' }],
    // The card is what shows without a map image.
    base: { mapImage: null },
    probe: { showHours: false },
    tests: [
      {
        file: LOCATION_SOURCE_TESTS,
        cases: [
          'draws the address card from Business info',
          'puts the address on a card only when there is no map image',
          'draws no address card without an address',
          'draws no address once the address lines are disconnected',
        ],
      },
    ],
  },
  {
    ...LOCATION,
    id: 'location.directionsLink',
    source: 'location.directionsLink',
    field: 'directionsLabel',
    resolvers: [{ module: '@/lib/location-links', export: 'directionsUrl' }],
    probe: { directionsLabel: 'Find us' },
    tests: [
      {
        file: LOCATION_SOURCE_TESTS,
        cases: [
          'links to Google Maps directions to the address, in a new tab',
          'points at the coordinates when Business info has them',
          'loads nothing from Google until it is followed',
          'draws no directions link without an address',
          'draws no directions link once the directions address is disconnected',
        ],
      },
    ],
  },
  {
    ...LOCATION,
    id: 'location.clickToLoadEmbed',
    source: 'location.clickToLoadEmbed',
    field: 'interactiveMap',
    resolvers: [
      { module: '@/lib/location-links', export: 'embedUrl' },
      { module: '@/features/pages/components/sections/location/map-embed', export: 'MapEmbed' },
    ],
    base: { mapImage: null },
    probe: { interactiveMap: true },
    tests: [
      {
        file: LOCATION_FACADE_TESTS,
        cases: [
          'draws no map or button when the interactive map is off',
          'draws no button, frame or Google address in the server markup',
          'offers a Load interactive map button, with a note that the map comes from Google',
          'loads the map only after a click, and moves focus to it',
          'draws no facade once the embed address is disconnected',
          'keeps the picture above the button when there is a map image',
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------------------------------
// The registry

export const EVIDENCE: readonly Evidence[] = [
  // A listing's design lives in Blog settings, so its controls are `settings.cardDesign.*` in the listing's
  // schema (design-components.ts) and its drawer draws the real PostCard from them.
  // The footer and a team member's page are views, drawn by their own drawers (design-capability-views.tsx).
  // Each has an Icons box that changes its social icons' container, so the probe picks a different shape.
  iconContainerEvidence({
    component: 'siteFooter',
    scope: 'section',
    box: 'navigation.footerIconDesign',
    render: 'src/features/site/components/footer-view.tsx',
    target: '[data-social-style] a',
    // The footer's icon controls are offered once its social row is on, and it draws circles until one is chosen.
    base: { 'navigation.footerShowSocial': true, 'navigation.footerSocialStyle': 'circle' },
    shape: 'square',
  }),
  iconContainerEvidence({
    component: 'teamMemberPage',
    scope: 'section',
    box: 'settings.iconDesign',
    render: 'src/features/team/components/team-member-page.tsx',
    target: '[data-social-style] a',
    base: {},
    shape: 'square',
  }),
  ...cardFamilyEvidence({
    component: 'blogPostCards',
    box: 'settings.cardDesign',
    render: 'src/features/blog/components/post-card.tsx',
    cardTarget: 'article',
    base: {},
    roles: ['meta', 'title', 'body'],
  }),
  // The glyph at the end of a post card (task 137): none until Blog settings chooses one.
  {
    id: 'blogPostCards.action.card',
    component: 'blogPostCards',
    capability: 'action',
    scope: 'card',
    field: 'settings.cardDesign.actionStyle',
    resolvers: [
      { module: '@/lib/sanity/card-action', export: 'resolveCardAction' },
      { module: '@/components/ui/action-indicator', export: 'ActionIndicator' },
    ],
    render: 'src/features/blog/components/post-card.tsx',
    target: '[data-link-arrow]',
    change: 'appears',
    base: {},
    probe: { 'settings.cardDesign.actionStyle': 'arrow' },
  },
  ...frameEvidence('hero', {
    mark: ['overlay', 'split', 'editorial', 'full-bleed'],
    glass: ['overlay', 'split', 'editorial'],
    edge: ['overlay', 'split', 'editorial', 'full-bleed'],
    motion: ['overlay', 'split', 'editorial', 'full-bleed'],
  }),
  {
    id: 'hero.slots.supporting',
    component: 'hero',
    capability: 'slots',
    scope: 'section',
    // What this proves is that the slot draws its block, in the wrapper the hero gives it. How each
    // layout then makes room for it (Editorial widens its grid) is placement, a separate part that no
    // evidence covers yet.
    part: 'block',
    layouts: ['overlay', 'split', 'editorial', 'full-bleed'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/hero/slots.tsx',
    target: '[data-hero-slot]',
    change: 'appears',
    base: { supporting: null },
    probe: { supporting: STATS_BAR },
  },
  ...cardFamilyEvidence({
    component: 'mediaText',
    layouts: ['side', 'stacked', 'overlay'],
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Our story' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
    headerRender: 'src/features/pages/components/sections/media-text.tsx',
  }),
  ...frameEvidence('mediaText', {
    mark: ['side', 'stacked', 'overlay'],
    overlay: ['side', 'stacked'],
    glass: ['side', 'stacked', 'overlay'],
    edge: ['side', 'stacked', 'overlay'],
    motion: ['side', 'stacked', 'overlay'],
  }),
  {
    id: 'mediaText.slots.media',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'block.media',
    layouts: ['side', 'stacked', 'overlay'],
    field: 'media',
    // The media slot's picture is chosen here and drawn as the section's picture, or its background.
    resolvers: [{ module: '@/features/pages/utils/split-layout', export: 'chooseMedia' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    // The picture has no hook of its own: with the slot empty the section draws no <img> at all.
    target: 'section img',
    change: 'appears',
    base: { media: null, image: null },
    probe: { media: SLOT_IMAGE },
  },
  {
    id: 'mediaText.slots.supporting',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'block.supporting',
    layouts: ['side', 'stacked', 'overlay'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    target: '[data-slot-video]',
    change: 'appears',
    base: { media: SLOT_IMAGE, supporting: null },
    probe: { supporting: SLOT_VIDEO },
  },
  // Placement: the layouts put the supporting block in the wrapper they give it (the harness), and
  // that wrapper sits where each layout says at phone, tablet and desktop widths (the measurements).
  // Side and Stacked share the media column, under the picture; Text over media puts it in the text,
  // under the buttons. The layouts themselves are unchanged.
  {
    id: 'mediaText.slots.placement.media',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'placement',
    layouts: ['side', 'stacked'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    // Drawn straight after the picture, in the wrapper the media column gives it.
    target: 'section .space-y-8 > :not([data-slot-video]) + [data-slot-video]',
    change: 'appears',
    base: { media: SLOT_IMAGE, supporting: null },
    probe: { supporting: SLOT_VIDEO },
    measured: [
      {
        file: MEDIA_TEXT_PLACEMENT_TESTS,
        cases: [
          'nothing leaves the window on any layout',
          "the video sits under the picture, in the picture's column",
          'the picture and the video sit above the text, in one column',
          'the video is the media, in its own column on a wide screen',
        ],
      },
    ],
  },
  {
    id: 'mediaText.slots.placement.text',
    component: 'mediaText',
    capability: 'slots',
    scope: 'section',
    part: 'placement',
    layouts: ['overlay'],
    field: 'supporting',
    resolvers: [{ module: '@/features/pages/slots/render-slot', export: 'renderSlot' }],
    render: 'src/features/pages/components/sections/media-text.tsx',
    // Drawn in the text, in the block under the buttons.
    target: 'section .mt-8 > [data-slot-video]',
    change: 'appears',
    base: { media: SLOT_IMAGE, supporting: null },
    probe: { supporting: SLOT_VIDEO },
    measured: [
      {
        file: MEDIA_TEXT_PLACEMENT_TESTS,
        cases: [
          'nothing leaves the window on any layout',
          'the video is in the text, under the buttons, over the picture',
        ],
      },
    ],
  },
  ...frameEvidence('testimonials', {
    overlay: ['grid', 'slider'],
    glass: ['grid', 'slider'],
    edge: ['grid', 'slider'],
    motion: ['grid', 'slider'],
  }),
  {
    id: 'testimonials.surface.card',
    component: 'testimonials',
    capability: 'surface',
    scope: 'card',
    layouts: TESTIMONIAL_LAYOUTS,
    field: 'cardDesign.border',
    resolvers: [{ module: '@/lib/sanity/surface-options', export: 'ringSurfaceLook' }],
    render: TESTIMONIALS,
    target: 'figure',
    change: 'attributes',
    base: TESTIMONIAL_CONTENT,
    probe: { 'cardDesign.border': 'thick' },
  },
  {
    id: 'testimonials.depth.card',
    component: 'testimonials',
    capability: 'depth',
    scope: 'card',
    layouts: TESTIMONIAL_LAYOUTS,
    field: 'cardDesign.shadow',
    resolvers: [{ module: '@/lib/sanity/depth-options', export: 'resolveCardDepth' }],
    render: TESTIMONIALS,
    target: 'figure',
    change: 'attributes',
    base: TESTIMONIAL_CONTENT,
    probe: { 'cardDesign.shadow': 'floating' },
  },
  ...(['quote', 'attribution', 'label'] as const).map((role): CapabilityEvidence => ({
    id: `testimonials.text.card.${role}`,
    component: 'testimonials',
    capability: 'text',
    scope: 'card',
    role,
    layouts: TESTIMONIAL_LAYOUTS,
    field: `cardDesign.${role}`,
    resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
    render: TESTIMONIALS,
    target: textRoleTarget(role),
    change: 'attributes',
    base: TESTIMONIAL_CONTENT,
    probe: { [`cardDesign.${role}.size`]: 'large' },
  })),
  ...(['eyebrow', 'heading', 'intro'] as const).map((role): CapabilityEvidence => ({
    id: `testimonials.header.section.${role}`,
    component: 'testimonials',
    capability: 'header',
    scope: 'section',
    role,
    layouts: TESTIMONIAL_LAYOUTS,
    field: `headerDesign.${role}`,
    resolvers: [{ module: '@/lib/sanity/text-style-options', export: 'textLook' }],
    render: 'src/components/ui/section-header.tsx',
    target: textRoleTarget(role),
    change: 'attributes',
    base: TESTIMONIAL_CONTENT,
    probe: { [`headerDesign.${role}.size`]: 'large' },
  })),
  // A mark draws nothing until it is chosen, so its claim is that the probe draws it. Each kind has its own
  // entry: a picture's is drawn from an approved frame document the fixtures hold, resolved through the
  // page query, and its mask is measured in a browser (a mask loads with CORS: card-design.spec.ts).
  ...(['section', 'card'] as const).flatMap((scope) =>
    (['text', 'icon', 'picture'] as const).map((kind): CapabilityEvidence => {
      const path = scope === 'section' ? 'style.mark' : 'cardDesign.mark'
      return {
        id: `testimonials.mark.${scope}.${kind}`,
        component: 'testimonials',
        capability: 'mark',
        scope,
        layouts: TESTIMONIAL_LAYOUTS,
        field: path,
        resolvers: [
          { module: '@/lib/sanity/decorative-mark-options', export: 'resolveDecorativeMark' },
        ],
        render: 'src/components/ui/decorative-mark.tsx',
        target: `[data-decorative-mark="${scope}"][data-mark-kind="${kind}"]`,
        change: 'appears',
        base: TESTIMONIAL_CONTENT,
        probe:
          kind === 'text'
            ? { [`${path}.kind`]: 'text', [`${path}.text`]: 'Thanks' }
            : kind === 'icon'
              ? { [`${path}.kind`]: 'icon', [`${path}.icon`]: 'heart' }
              : // An approved frame, resolved to its CDN artwork by the page query like a real one.
                {
                  [`${path}.kind`]: 'picture',
                  [`${path}.picture`]: { _type: 'reference', _ref: 'frame-picture' },
                },
        measured: [{ file: 'tests/e2e/card-design.spec.ts', cases: [MARK_MEASURED[scope]] }],
      }
    }),
  ),
  {
    id: 'testimonials.manual',
    component: 'testimonials',
    source: 'testimonials.manual',
    layouts: ['grid', 'slider'],
    field: 'items',
    resolvers: [
      {
        module: '@/features/pages/components/sections/testimonials/quote-card',
        export: 'QuoteCard',
      },
    ],
    render: 'src/features/pages/components/sections/testimonials/quote-card.tsx',
    base: {
      items: [{ _key: 'q1', _type: 'testimonial', quote: 'Kind words.', name: 'Fixture Person' }],
    },
    probe: { 'items.0.quote': 'Different kind words.' },
    tests: [
      {
        file: 'src/features/pages/components/sections/testimonials/manual-source.test.tsx',
        cases: [
          'draws each stored quote, name and role in its own card',
          'draws only what was stored',
          'draws no source label or rating unless stored',
          'draws a stored source, date, rating and attribution as plain words, with no review markup',
          'never draws the permission confirmation',
          'draws no cards without items',
          'draws nothing of its own once the quote card is disconnected',
        ],
      },
    ],
  },
  ...frameEvidence('richText', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'featuresGrid',
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Why us', intro: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  iconContainerEvidence({
    component: 'featuresGrid',
    render: 'src/components/ui/item-icon.tsx',
    base: {
      items: [{ _key: 'probe-feature', _type: 'featureItem', title: 'Fast', iconName: 'star' }],
    },
  }),
  ...frameEvidence('featuresGrid', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'logoCloud',
    layouts: ['grid', 'marquee'],
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Trusted by', intro: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('logoCloud', {
    mark: ['grid', 'marquee'],
    overlay: ['grid', 'marquee'],
    glass: ['grid', 'marquee'],
    edge: ['grid', 'marquee'],
    motion: ['grid', 'marquee'],
  }),
  // The Divided list is the default and draws no card; Cards is a setting. Each look proves its own text, and
  // only Cards proves a fill, a border and a mark. Unset is Divided, so its base stores nothing.
  ...cardFamilyEvidence({
    component: 'faq',
    look: 'divided',
    parts: ['text', 'header'],
    render: 'src/features/pages/components/sections/faq.tsx',
    cardTarget: 'details',
    base: { eyebrow: 'Questions', intro: 'An intro.' },
    roles: ['title', 'body'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...cardFamilyEvidence({
    component: 'faq',
    look: 'cards',
    parts: ['surface', 'text', 'mark'],
    render: 'src/features/pages/components/sections/faq.tsx',
    cardTarget: 'div.relative.rounded-card',
    base: { 'cardDesign.itemStyle': 'cards' },
    roles: ['title', 'body'],
  }),
  ...frameEvidence('faq', { mark: true, overlay: true, glass: true, edge: true, motion: true }),
  // The CTA banner draws its own card, so the shared Panel isn't offered: its glass is pending.
  ...cardFamilyEvidence({
    component: 'ctaBanner',
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Ready?', text: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('ctaBanner', { mark: true, overlay: true, edge: true, motion: true }),
  ...cardFamilyEvidence({
    component: 'formSection',
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Contact', text: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('formSection', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'pricingTable',
    render: 'src/features/pages/components/sections/pricing-table.tsx',
    cardTarget: 'ul.grid > li',
    // Every role needs content to draw: the description and detail line are optional, the rest always draw.
    base: {
      eyebrow: 'Plans',
      plans: [
        {
          _key: 'probe-plan-1',
          _type: 'plan',
          price: { _type: 'reference', _ref: 'stripePrice-price_Starter1' },
          description: 'A line about this plan.',
          meta: '90 minutes',
          features: ['One project', 'Email support'],
        },
        {
          _key: 'probe-plan-2',
          _type: 'plan',
          price: { _type: 'reference', _ref: 'stripePrice-price_Pro1' },
          features: ['Unlimited projects'],
          highlighted: true,
        },
      ],
    },
    roles: ['title', 'price', 'body', 'label', 'description'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
    item: { array: 'plans' },
    depth: true,
  }),
  iconContainerEvidence({
    component: 'pricingTable',
    render: 'src/components/ui/icon-container.tsx',
    base: {
      plans: [
        {
          _key: 'probe-plan-1',
          _type: 'plan',
          price: { _type: 'reference', _ref: 'stripePrice-price_Starter1' },
          features: ['One project'],
        },
      ],
    },
    change: 'appears',
  }),
  ...frameEvidence('pricingTable', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'newsletterSignup',
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Updates', text: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('newsletterSignup', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'stats',
    layouts: ['inline', 'cards'],
    // Only the Cards layout draws a card, and 156 item 6 gives only its figures and labels text roles.
    cardLayouts: ['cards'],
    roleLayouts: ['cards'],
    render: 'src/features/pages/components/sections/stats/cards.tsx',
    cardTarget: 'ul.grid > li',
    base: { eyebrow: 'In numbers', intro: 'An intro.' },
    roles: ['number', 'label'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('stats', {
    mark: ['inline', 'cards'],
    overlay: ['inline', 'cards'],
    glass: ['inline', 'cards'],
    edge: ['inline', 'cards'],
    motion: ['inline', 'cards'],
  }),
  ...cardFamilyEvidence({
    component: 'gallery',
    layouts: ['grid', 'masonry', 'slider'],
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Our work', intro: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('gallery', {
    mark: ['grid', 'masonry', 'slider'],
    overlay: ['grid', 'masonry', 'slider'],
    glass: ['grid', 'masonry', 'slider'],
    edge: ['grid', 'masonry', 'slider'],
    motion: ['grid', 'masonry', 'slider'],
  }),
  // Without a map image the details are cards, the look that proves a fill, a border and a mark. Beside one
  // they stack on the section, so that look proves only its text. Each look proves its own.
  ...cardFamilyEvidence({
    component: 'location',
    look: 'cards',
    render: 'src/features/pages/components/sections/location/index.tsx',
    cardTarget: 'div.rounded-card.p-8',
    base: { eyebrow: 'Find us', intro: 'An intro.', mapImage: null },
    roles: ['title', 'body', 'meta'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...cardFamilyEvidence({
    component: 'location',
    look: 'picture',
    parts: ['text'],
    render: 'src/features/pages/components/sections/location/index.tsx',
    cardTarget: 'div.rounded-card.p-8',
    base: { mapImage: PICTURE },
    roles: ['title', 'body', 'meta'],
  }),
  iconContainerEvidence({
    component: 'location',
    scope: 'section',
    render: 'src/features/pages/components/sections/location/index.tsx',
    base: { mapImage: null },
    change: 'appears',
  }),
  ...frameEvidence('location', {
    mark: true,
    overlay: true,
    glass: true,
    edge: true,
    motion: true,
  }),
  ...cardFamilyEvidence({
    component: 'team',
    layouts: ['grid', 'slider', 'list'],
    render: 'src/features/pages/components/sections/team/team-card.tsx',
    // A card (grid, slider) and a row (list) are both the one element with these classes.
    cardTarget: 'div.relative.rounded-card',
    base: { eyebrow: 'Our people', text: 'An intro.' },
    roles: ['title', 'meta', 'body'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
    depth: true,
  }),
  // The glyph at the end of a card or row that links to a member's page (task 137): none until chosen.
  {
    id: 'team.action.card',
    component: 'team',
    capability: 'action',
    scope: 'card',
    layouts: ['grid', 'slider', 'list'],
    field: 'cardDesign.actionStyle',
    resolvers: [
      { module: '@/lib/sanity/card-action', export: 'resolveCardAction' },
      { module: '@/components/ui/action-indicator', export: 'ActionIndicator' },
    ],
    render: 'src/features/pages/components/sections/team/team-card.tsx',
    target: '[data-link-arrow]',
    change: 'appears',
    base: { eyebrow: 'Our people', text: 'An intro.' },
    probe: { 'cardDesign.actionStyle': 'arrow' },
  },
  ...frameEvidence('team', {
    mark: ['grid', 'slider', 'list'],
    overlay: ['grid', 'slider', 'list'],
    glass: ['grid', 'slider', 'list'],
    edge: ['grid', 'slider', 'list'],
    motion: ['grid', 'slider', 'list'],
  }),
  ...cardFamilyEvidence({
    component: 'video',
    layouts: ['embed', 'ambient'],
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Watch', text: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('video', {
    overlay: ['embed', 'ambient'],
    glass: ['embed', 'ambient'],
    edge: ['embed', 'ambient'],
    motion: ['embed', 'ambient'],
  }),
  ...cardFamilyEvidence({
    component: 'process',
    layouts: ['vertical', 'alternating'],
    parts: ['text', 'header'],
    render: 'src/features/pages/components/sections/process/process-step.tsx',
    cardTarget: '',
    base: {
      eyebrow: 'How it works',
      intro: 'An intro.',
      steps: [
        { _key: 'probe-step-1', _type: 'step', label: 'Step one', title: 'Meet', text: 'We talk.' },
        {
          _key: 'probe-step-2',
          _type: 'step',
          label: 'Step two',
          title: 'Build',
          text: 'We make it.',
        },
      ],
    },
    roles: ['label', 'title', 'body'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  iconContainerEvidence({
    component: 'process',
    layouts: ['vertical', 'alternating'],
    render: 'src/components/ui/item-icon.tsx',
    base: {
      steps: [
        { _key: 'probe-step-1', _type: 'step', title: 'Meet', iconName: 'star' },
        { _key: 'probe-step-2', _type: 'step', title: 'Build', iconName: 'heart' },
      ],
    },
  }),
  ...frameEvidence('process', {
    mark: ['vertical', 'alternating'],
    overlay: ['vertical', 'alternating'],
    glass: ['vertical', 'alternating'],
    edge: ['vertical', 'alternating'],
    motion: ['vertical', 'alternating'],
  }),
  ...cardFamilyEvidence({
    component: 'embed',
    parts: ['header'],
    render: 'src/components/ui/section-header.tsx',
    cardTarget: '',
    base: { eyebrow: 'Book', text: 'An intro.' },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  ...frameEvidence('embed', { overlay: true, glass: true, edge: true, motion: true }),
  ...cardFamilyEvidence({
    component: 'events',
    layouts: ['list', 'agenda', 'featured'],
    // Only the Featured layout draws a card: the rows of the others get text roles alone.
    cardLayouts: ['featured'],
    render: 'src/features/pages/components/sections/events/events-parts.tsx',
    cardTarget: 'article.relative.rounded-card',
    base: { eyebrow: 'What’s on', text: 'An intro.' },
    roles: ['title', 'meta', 'body'],
    headerRoles: ['eyebrow', 'heading', 'intro'],
    depth: true,
  }),
  // The glyph at the end of a linked card (task 137). The List draws a chevron with nothing chosen, so a
  // choice changes it; Featured draws none, so a choice makes one appear.
  ...(['list', 'featured'] as const).map((layout): CapabilityEvidence => ({
    id: layout === 'list' ? 'events.action.card' : 'events.action.card.featured',
    component: 'events',
    capability: 'action',
    scope: 'card',
    layouts: [layout],
    field: 'cardDesign.actionStyle',
    resolvers: [
      { module: '@/lib/sanity/card-action', export: 'resolveCardAction' },
      { module: '@/components/ui/action-indicator', export: 'ActionIndicator' },
    ],
    render: 'src/features/pages/components/sections/events/events-parts.tsx',
    target: '[data-link-arrow]',
    change: layout === 'list' ? 'attributes' : 'appears',
    base: { eyebrow: 'What’s on', text: 'An intro.' },
    probe: { 'cardDesign.actionStyle': 'arrow' },
  })),
  ...frameEvidence('events', {
    mark: ['list', 'agenda', 'featured'],
    overlay: ['list', 'agenda', 'featured'],
    glass: ['list', 'agenda', 'featured'],
    edge: ['list', 'agenda', 'featured'],
    motion: ['list', 'agenda', 'featured'],
  }),
  ...locationSources,
  ...cardFamilyEvidence({
    component: 'linkList',
    layouts: ALL_LINK_LIST,
    parts: ['header'],
    render: 'src/features/pages/components/sections/link-list/link-list-heading.tsx',
    headerRender: 'src/features/pages/components/sections/link-list/link-list-heading.tsx',
    cardTarget: '',
    base: {
      eyebrow: 'Find me',
      intro: 'An intro.',
      title: 'Fixture heading',
      headingDisplay: 'text',
    },
    roles: [],
    headerRoles: ['eyebrow', 'heading', 'intro'],
  }),
  // A mark at card and at item scope, each its own claim, on every layout and on a Glass row.
  ...cardFamilyEvidence({
    component: 'linkList',
    layouts: ALL_LINK_LIST,
    parts: ['mark'],
    render: `${LINK_LIST}/link-design.tsx`,
    cardTarget: '',
    base: linkListContent(true),
    roles: [],
    item: { array: 'links' },
  }),
  ...cardFamilyEvidence({
    component: 'linkList',
    look: 'glass',
    layouts: ['stacked'],
    parts: ['mark'],
    render: `${LINK_LIST}/glass-row.tsx`,
    cardTarget: '',
    base: { ...linkListContent(true), rowStyle: 'glass' },
    roles: [],
    item: { array: 'links' },
  }),
  ...frameEvidence('linkList', {
    mark: ['stacked', 'cards', 'editorial', 'compact'],
    overlay: ALL_LINK_LIST,
    edge: ALL_LINK_LIST,
    motion: ALL_LINK_LIST,
  }),
  ...linkListEvidence,
  ...slotBlockEvidence,
]
