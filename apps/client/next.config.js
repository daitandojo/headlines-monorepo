// apps/client/next.config.js (version 12.0.0 - Monorepo Final CJS)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is critical for monorepo setups.
  // It tells Next.js to explicitly compile the shared packages.
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
