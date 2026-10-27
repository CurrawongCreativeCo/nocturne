import { defineFeatureConfig } from '@/config/feature-config'

export const redirectsConfig = defineFeatureConfig({
  id: 'redirects',
  title: 'Edge Config redirects',
  summary:
    "Answers the Studio's redirects before any page renders, from a map kept in Vercel Edge Config.",
  why: 'Redirects reach visitors with a single clean response, and quickly, on a site with a lot of traffic.',
  withoutIt:
    'The page route answers redirects instead: the request renders, finds no page and redirects. No token is needed and nothing is lost.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#edge-config-redirects',
  setup: [
    "Only for a site whose traffic needs it: the page route's redirects are the default and need no token.",
    'In Vercel → Storage, create an Edge Config store and connect it to the project. Vercel adds EDGE_CONFIG.',
    "Add VERCEL_API_TOKEN: it must be a team token, because a project-scoped token cannot write Edge Config (measured, task 235). It is a write-capable token in a public site's runtime: read the risk in the README first.",
    'Set up webhook mode, then publish a redirect to seed the map.',
  ],
  settings: [
    {
      name: 'EDGE_CONFIG',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: true,
      purpose:
        "The connection string the proxy reads redirects with. It contains a read token, so it is a secret; it also shows the store's id, which is how the site finds the store to write to.",
      default: 'Unset: the page route answers redirects',
      source: 'Added by Vercel when you connect an Edge Config store to the project',
      managedBy: 'provider',
    },
    {
      name: 'EDGE_CONFIG_ID',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose:
        "The store's ecfg_ id. Usually not needed: the site reads it from EDGE_CONFIG. Set it only if the connection string doesn't show one; if both are set they must name the same store, or nothing is written.",
      default: 'Derived from EDGE_CONFIG',
      source: 'Vercel → Storage → your Edge Config → Settings, the id starting ecfg_',
    },
    {
      name: 'VERCEL_API_TOKEN',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: { when: 'EDGE_CONFIG' },
      purpose:
        "Lets a publish rewrite the redirects map. Only a team token can: a project-scoped token is refused (task 235). Whoever controls the site's runtime can use it on every project in that team, so this is not recommended; page-route redirects need no token.",
      default: 'Unset: the map is never written, and the page route answers redirects',
      source: 'vercel.com/account/tokens, scoped to the team that owns the store',
      docs: 'README.md#edge-config-redirects',
    },
    {
      name: 'VERCEL_TEAM_ID',
      kind: 'server-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      required: false,
      purpose:
        'Needed only with a full-account token. A team token or a project-scoped token infers the team, and sending the id as well does no harm.',
      default: 'Unset: the token decides the team',
      source: 'Vercel → team Settings → Team ID',
    },
  ],
  readiness: 'getRedirectsReadiness',
  verify: [],
})
