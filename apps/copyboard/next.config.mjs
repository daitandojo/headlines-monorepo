// File: apps/copyboard/next.config.mjs
/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: [
    '@headlines/config/next',
    '@headlines/data-access/next',
    '@headlines/models',
    '@headlines/utils-shared/next',
  ],
  webpack: (config, { isServer }) => {
    config.externals.push(
      'bcrypt',
      'sharp',
      'mongodb-client-encryption',
      'aws4',
      'undici',
      'playwright' // <-- ADD THIS LINE
    )

    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig
