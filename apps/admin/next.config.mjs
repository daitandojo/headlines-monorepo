/** @type {import('next').NextConfig} */

import path from 'path'

const nextConfig = {
  transpilePackages: [
    '@headlines/ui',
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

    config.externals.push('bcrypt', 'playwright')
    if (isServer) {
      config.externals.push('onnxruntime-node')
    }
    return config
  },
}

export default nextConfig
