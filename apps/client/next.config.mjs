// File: apps/client/next.config.mjs
/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: [
    '@headlines/config',
    '@headlines/data-access',
    '@headlines/models',
    '@headlines/utils-shared',
  ],
  webpack: (config, { isServer }) => {
      config.externals.push(
        'onnxruntime-node',
        '@xenova/transformers',
        'sharp',
        'bcrypt',
        'mongodb-client-encryption',
        'aws4'
      )

    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
      '@xenova/transformers': false,
    }
    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig