import containerFrames from './scripts/postcss-container-frames.mjs'

// The style guide's width frames need container-query copies of the responsive rules (see the
// plugin). The live site has no use for them, so Vercel production builds leave them out.
const frames = process.env.VERCEL_ENV !== 'production'

const config = {
  plugins: [
    '@tailwindcss/postcss',
    ...(frames ? [containerFrames({ include: /[\\/]src[\\/]styles[\\/]globals\.css$/ })] : []),
  ],
}

export default config
