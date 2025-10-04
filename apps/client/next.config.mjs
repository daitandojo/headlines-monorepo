/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@headlines/config',
    '@headlines/models',
    '@headlines/utils-shared',
  ],
  experimental: {
    // These packages are server-only and should not be bundled into serverless functions.
    // data-access is now here because it's no longer transpiled.
    serverComponentsExternalPackages: [
      '@headlines/data-access',
      '@headlines/ai-services',
      '@headlines/scraper-logic',
      '@headlines/utils-server',
      '@headlines/prompts',
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
  // Use SWC instead of Terser for better async support
  swcMinify: true,
}

export default nextConfig
