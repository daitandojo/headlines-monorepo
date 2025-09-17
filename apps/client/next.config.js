// apps/client/next.config.js (version 11.0.0 - CJS Naming Fix)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is critical for monorepo setups, especially for Tailwind CSS.
  transpilePackages: ['@headlines/ui', '@headlines/utils'],

  webpack: (config, { isServer }) => {
    // This tells Webpack to not try and bundle native modules.
    config.externals.push('bcrypt')

    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

module.exports = nextConfig
