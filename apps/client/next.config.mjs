// File: apps/client/next.config.mjs
/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: [
    '@headlines/config/next',
    '@headlines/data-access',
    '@headlines/models',
    '@headlines/utils-shared/next',
  ],
  webpack: (config, { isServer }) => {
    config.externals.push(
      'bcrypt',
      'sharp',
      'mongodb-client-encryption',
      'aws4',
      'undici'
    )

    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig
