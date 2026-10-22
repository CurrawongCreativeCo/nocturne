import containerFrames, { includeContainerFrames } from './scripts/postcss-container-frames.mjs'

// The style guide's width frames need container-query copies of the responsive rules (see the
// plugin). Only development, preview and gallery test builds need these rules.
const frames = includeContainerFrames(process.env)

const config = {
  plugins: [
    '@tailwindcss/postcss',
    ...(frames ? [containerFrames({ include: /[\\/]src[\\/]styles[\\/]globals\.css$/ })] : []),
  ],
}

export default config
