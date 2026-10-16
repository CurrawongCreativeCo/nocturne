import type { SiteProfile } from '@/config/profile'

export type ActionTarget =
  /** A Studio tool, optionally with a path inside it and a query string. */
  | { kind: 'tool'; tool: string; path?: string; search?: string }
  | { kind: 'intent'; intent: 'create' | 'edit'; params: { type: string; id?: string } }
  /** Scrolls to the Help panel on this screen. */
  | { kind: 'help' }

export interface QuickAction {
  id: 'website' | 'blog' | 'events' | 'team' | 'business' | 'help'
  title: string
  description: string
  target: ActionTarget
}

/**
 * The cards on Start here. A feature the profile switches off, or whose document type is not in
 * this Studio's schema (a client site may have removed it), gets no card, so a link never leads
 * to a screen that is not there.
 */
export function buildQuickActions(
  profile: Pick<SiteProfile, 'features'>,
  schemaTypes: ReadonlySet<string>,
): QuickAction[] {
  const { features } = profile
  const actions: QuickAction[] = [
    {
      id: 'website',
      title: 'Edit your website',
      description: 'See the site and click any text to change it.',
      target: { kind: 'tool', tool: 'presentation', search: 'preview=%2F' },
    },
  ]
  if (features.blog && schemaTypes.has('post')) {
    actions.push({
      id: 'blog',
      title: 'Write a blog post',
      description: 'Start a new article. It stays a draft until you publish it.',
      target: { kind: 'intent', intent: 'create', params: { type: 'post' } },
    })
  }
  if (features.events && schemaTypes.has('event')) {
    actions.push({
      id: 'events',
      title: 'Add an event',
      description: 'Put a workshop, class or open day on the calendar.',
      target: { kind: 'intent', intent: 'create', params: { type: 'event' } },
    })
  }
  if (features.team && schemaTypes.has('teamMember')) {
    actions.push({
      id: 'team',
      title: 'Update the team',
      description: 'Add, change or remove the people shown on your site.',
      target: { kind: 'tool', tool: 'structure', path: '/team' },
    })
  }
  if (features.businessInfo && schemaTypes.has('businessInfo')) {
    actions.push({
      id: 'business',
      title: 'Business info and opening hours',
      description: 'Your phone, address and the hours shown in the footer.',
      target: {
        kind: 'intent',
        intent: 'edit',
        params: { type: 'businessInfo', id: 'businessInfo' },
      },
    })
  }
  actions.push({
    id: 'help',
    title: 'Help',
    description: 'Read the guide or get in touch with us.',
    target: { kind: 'help' },
  })
  return actions
}

/** The Studio URL of a tool target, under the Studio's base path. */
export function toolHref(
  target: Extract<ActionTarget, { kind: 'tool' }>,
  basePath: string,
): string {
  return `${basePath}/${target.tool}${target.path ?? ''}${target.search ? `?${target.search}` : ''}`
}
