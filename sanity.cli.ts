import { defineCliConfig } from 'sanity/cli'

import { dataset, projectId } from './src/config/env'

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    // Scans these files for `defineQuery()` calls.
    path: './src/**/*.{ts,tsx}',
    // Written by `sanity schema extract` (see `npm run typegen`).
    schema: './schema.json',
    generates: './src/types/sanity.types.ts',
    // Registers every query in the global `SanityQueries` map, so
    // `sanityFetch({query})` returns the generated type with no generics.
    overloadClientMethods: true,
  },
})
