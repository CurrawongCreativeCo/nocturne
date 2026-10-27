import { defineFeatureConfig } from '@/config/feature-config'

export const opsNoticesConfig = defineFeatureConfig({
  id: 'start-here',
  title: 'Ops notices on Start here',
  summary: "Shows notices from the Ops dashboard on the Studio's Start here screen.",
  why: 'The agency can tell a client something (a renewal, a maintenance window) where they will see it.',
  withoutIt: 'The notices panel is skipped. Nothing else on Start here changes.',
  dormant: 'No Ops endpoint exists yet, and Foundation is local, so nothing can serve notices.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#start-here-studio-home-screen',
  setup: [
    'Nothing to do yet: the settings are registered for when an Ops endpoint exists.',
    'Then add OPS_NOTICES_URL (an https endpoint that answers { "notices": [...] } for ?site=<client slug>) and, if it needs one, OPS_NOTICES_KEY.',
  ],
  settings: [
    {
      name: 'OPS_NOTICES_URL',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose: 'The https endpoint the notices come from.',
      default: 'Unset: the notices panel is skipped',
    },
    {
      name: 'OPS_NOTICES_KEY',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose:
        'Sent to that endpoint as a bearer token from the server. It never reaches the browser.',
    },
  ],
  verify: [],
})
