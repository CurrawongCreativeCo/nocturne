/**
 * Pre-commit checks on staged files only (see .husky/pre-commit). ESLint fixes what it can
 * and fails on anything left; Prettier formats last so the committed code is always formatted.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{ts,tsx,js,mjs,cjs}': [
    'eslint --fix --max-warnings 0 --no-warn-ignored',
    'prettier --write --ignore-unknown',
  ],
  '*.{json,md,css,html,yml,yaml}': 'prettier --write --ignore-unknown',
}

export default config
