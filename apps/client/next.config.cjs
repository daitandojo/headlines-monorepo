// apps/client/next.config.js (version 12.1.0 - Native Module Fix)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is critical for monorepo setups.
  transpilePackages: ['@headlines/ui', '@headlines/utils'],

  webpack: (config, { isServer }) => {
    // This tells Webpack to not try and bundle native modules.
    config.externals.push('bcrypt')

    // DEFINITIVE FIX: Add onnxruntime-node to the externals for server-side builds.
    // This prevents Webpack from trying to bundle the native .node binary.
    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

module.exports = nextConfig
