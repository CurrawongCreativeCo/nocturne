/**
 * Formatting is Prettier's job; ESLint only checks correctness (eslint-config-prettier
 * turns off its formatting rules). Run `npm run format` to apply.
 *
 * @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions}
 */
const config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  // Sorts Tailwind classes into the official order; v4 reads the theme from the stylesheet.
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/globals.css',
}

export default config
