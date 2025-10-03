/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@headlines/config',
    '@headlines/data-access',
    '@headlines/models',
    '@headlines/utils-shared',
  ],
  webpack: (config, { isServer }) => {
    // This is the crucial part. It tells Next.js to treat these packages
    // as "external" and not to bundle them into the server-side lambda functions.
    // This is necessary for large packages with native binaries that Vercel's
    // bundler might otherwise exclude.
    config.externals.push(
      'onnxruntime-node',
      '@xenova/transformers',
      'sharp',
      'bcrypt',
      'mongodb-client-encryption',
      'aws4'
    )

    // This part is sometimes needed to prevent client-side bundling attempts of server-only packages.
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
      '@xenova/transformers': false,
    }

    return config
  },
}

export default nextConfig
