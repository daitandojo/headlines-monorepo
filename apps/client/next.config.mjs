/** @type {import('next').NextConfig} */

import path from 'path'

const nextConfig = {
  transpilePackages: [
    '@headlines/ui',
    '@headlines/utils',
    '@headlines/utils-client',
    '@headlines/utils-server',
    '@headlines/config',
    '@headlines/auth',
    '@headlines/actions',
    '@headlines/models',
    '@headlines/prompts',
    '@headlines/scraper-logic',
    '@headlines/ai-services',
  ],
  webpack: (config, { isServer }) => {
    // Add aliases for React to ensure all packages use the same instance
    // This is the definitive fix for the 'useContext is null' error in monorepos.
    config.resolve.alias['react'] = path.resolve('./node_modules/react')
    config.resolve.alias['react-dom'] = path.resolve('./node_modules/react-dom')

    // DEFINITIVE FIX: Add native dependencies to externals.
    config.externals.push(
      'bcrypt',
      'playwright',
      'mongodb-client-encryption',
      'aws4',
      'sharp'
    )

    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig
