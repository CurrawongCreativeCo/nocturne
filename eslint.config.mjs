import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Bulletproof React architecture rules. Imports flow one way:
 *
 *   shared (components, config, lib, styles, types, utils)  ->  features  ->  app
 *
 * - Shared code can't import features or app.
 * - Features can't import app, or each other (compose them in app/ instead).
 * - `sanity.config.ts` at the root is a composition root like app/.
 *
 * Add a zone below when you add a feature.
 */
const features = ['pages', 'site', 'draft-mode', 'studio']

const crossFeatureZones = features.map((feature) => ({
  target: `./src/features/${feature}`,
  from: './src/features',
  except: [`./${feature}`],
  message: 'Features must not import other features. Compose them in src/app instead.',
}))

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            ...crossFeatureZones,
            {
              target: './src/features',
              from: './src/app',
              message: 'Features must not import from app.',
            },
            {
              target: [
                './src/components',
                './src/config',
                './src/lib',
                './src/styles',
                './src/types',
                './src/utils',
              ],
              from: ['./src/features', './src/app'],
              message: 'Shared modules must not import features or app.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/types/sanity.types.ts']),
])
