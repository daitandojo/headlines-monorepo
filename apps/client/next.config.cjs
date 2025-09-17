// apps/client/next.config.cjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@headlines/ui', '@headlines/utils'],
  webpack: (config, { isServer }) => {
    config.externals.push('bcrypt')
    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

module.exports = nextConfig
