// File: apps/client/next.config.mjs (FINAL ATTEMPT)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this postcss section
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  transpilePackages: [
    '@headlines/config',
    '@headlines/models',
    '@headlines/utils-shared',
  ],
  experimental: {
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
      config.externals.push({
        '@xenova/transformers': '@xenova/transformers',
        'onnxruntime-node': 'commonjs onnxruntime-node',
        sharp: 'commonjs sharp',
        bcrypt: 'commonjs bcrypt',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        aws4: 'commonjs aws4',
      })
    } else {
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
  swcMinify: true,
}

export default nextConfig
