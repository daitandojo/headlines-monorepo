// apps/client/next.config.mjs (version 12.2.0 - Final ESM Consolidated)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is critical for monorepo setups.
  // It tells Next.js to explicitly compile the shared packages.
  transpilePackages: ['@headlines/ui', '@headlines/utils'],
  
  webpack: (config, { isServer }) => {
    // This tells Webpack to not try and bundle native modules.
    config.externals.push('bcrypt');
    
    // This handles the onnxruntime-node native module for server-side builds.
    if (isServer) {
      config.externals.push('onnxruntime-node');
    }
    return config;
  },
};

export default nextConfig;