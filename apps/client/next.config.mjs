/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@headlines/config',
    '@headlines/data-access',
    '@headlines/models',
    '@headlines/utils-shared',
  ],
  experimental: {
    // Tell Next.js these packages should NOT be bundled into serverless functions
    serverComponentsExternalPackages: [
      '@xenova/transformers',
      'sharp',
      'onnxruntime-node',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark these as external so they're loaded from node_modules at runtime
      // This prevents webpack from trying to bundle them
      config.externals.push({
        '@xenova/transformers': '@xenova/transformers',
        'onnxruntime-node': 'commonjs onnxruntime-node',
        sharp: 'commonjs sharp',
        bcrypt: 'commonjs bcrypt',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        aws4: 'commonjs aws4',
      })
    } else {
      // Prevent client-side bundling of server-only packages
      config.resolve.alias = {
        ...config.resolve.alias,
        '@xenova/transformers': false,
        'onnxruntime-node': false,
        sharp: false,
        bcrypt: false,
      }
    }

    return config
  },
  // Disable minification for problematic packages or configure terser to handle async
  swcMinify: true, // Use SWC instead of Terser (better async support)
}

export default nextConfig
