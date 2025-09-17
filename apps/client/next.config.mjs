// apps/client/next.config.mjs (version 10.0.0 - Monorepo Consolidated)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is the critical fix for monorepo setups.
  // It tells Next.js to explicitly compile the shared packages.
  // Without this, Tailwind cannot "see" the classes inside your UI components.
  transpilePackages: ['@headlines/ui', '@headlines/utils'],

  webpack: (config, { isServer }) => {
    // This part is merged from the old .cjs file.
    // It tells Webpack to not try and bundle native modules.
    config.externals.push('bcrypt')

    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig
