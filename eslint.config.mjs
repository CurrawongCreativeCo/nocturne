import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

/**
 * Layers, strictest available for each concern:
 *  1. Next.js core-web-vitals (React, hooks, Next rules)
 *  2. typescript-eslint strict-type-checked + stylistic-type-checked (type-aware)
 *  3. jsx-a11y strict: all 33 accessibility rules as errors (Next enables 6, as warnings)
 *  4. Import order and architecture boundaries
 *  5. eslint-config-prettier last: formatting belongs to Prettier
 *
 * Bulletproof React architecture rules. Imports flow one way:
 *
 *   shared (components, config, lib, styles, types)  ->  features  ->  app
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
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { rules: jsxA11y.flatConfigs.strict.rules },
  {
    rules: {
      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `||` on strings is deliberate: an empty title should fall back just like a missing one.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Correctness
      eqeqeq: ['error', 'smart'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // React
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/no-array-index-key': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

      // Imports: external, then @/ aliases, then relative; alphabetized, one blank line between groups.
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/no-cycle': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
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
              ],
              from: ['./src/features', './src/app'],
              message: 'Shared modules must not import features or app.',
            },
          ],
        },
      ],
    },
  },
  {
    // Plain JS (configs, Node scripts) has no type information to check against.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // CLI scripts report progress on the console.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    'src/types/sanity.types.ts',
    'public/**',
  ]),
])
