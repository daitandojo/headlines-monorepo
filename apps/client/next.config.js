// next.config.js (version 5.0)
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'onnxruntime-node']
    }
    return config
  },
}

module.exports = nextConfig
