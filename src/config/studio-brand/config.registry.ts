import { defineFeatureConfig } from '@/config/feature-config'

export const studioBrandConfig = defineFeatureConfig({
  id: 'studio-brand',
  title: 'Studio name',
  summary: "The name in the Studio's header and browser tab.",
  why: "The client's Studio carries their name instead of Currawong's.",
  withoutIt: 'The Studio is named by studio-brand.json, then Nocturne.',
  profileFlag: null,
  tier: 'optional',
  docs: 'README.md#cms-branding',
  setup: [
    'Set "name" in studio-brand.json (the name field of the CMS brand) and deploy.',
    'Delete NEXT_PUBLIC_STUDIO_TITLE from Vercel and .env.local once the name is in studio-brand.json.',
  ],
  settings: [
    {
      name: 'NEXT_PUBLIC_STUDIO_TITLE',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview', 'development'],
      buildTime: true,
      required: false,
      purpose: "The Studio's name, used only while studio-brand.json has no name.",
      default: 'Nocturne',
      deprecated: {
        since: '1.9.0',
        replacedBy: 'the name in studio-brand.json, which already wins over it',
        migration:
          'Copy the value into "name" in studio-brand.json, deploy, then delete the variable from Vercel and .env.local.',
        removeWhen:
          'One minor release after this deprecation has shipped, the setup wizard no longer writes it, and the removal is approved as its own versioned decision.',
      },
      envExample: false,
    },
  ],
  verify: ['check-studio-brand'],
})
