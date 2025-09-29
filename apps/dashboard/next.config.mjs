// File: headlines/apps/dashboard/next.config.mjs (Corrected and Simplified)
/** @type {import('next').NextConfig} */

import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  transpilePackages: [
    '@headlines/utils-server',
    '@headlines/config',
    '@headlines/data-access',
    '@headlines/models',
    '@headlines/prompts',
    '@headlines/ai-services',
    // --- ADD THIS ---
    '@headlines/utils-shared',
  ],
  webpack: (config, { isServer }) => {
    // --- START: DEFINITIVE FIX FOR DUPLICATE REACT ---
    config.resolve.symlinks = false
    config.resolve.alias['react'] = path.resolve(__dirname, 'node_modules/react')
    config.resolve.alias['react-dom'] = path.resolve(__dirname, 'node_modules/react-dom')
    // --- END: DEFINITIVE FIX ---

    // This section can remain as is
    config.externals.push(
      'bcrypt',
      'playwright',
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
