// apps/admin/next.config.mjs (version 10.0.0 - Monorepo Stable)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is the critical fix for monorepo setups.
  // It tells Next.js to explicitly compile the shared packages from your 'packages' directory.
  // Without this, Tailwind cannot "see" the classes inside your UI components.
  transpilePackages: ['@headlines/ui', '@headlines/utils'],
  
  webpack: (config, { isServer }) => {
    // CRITICAL FIX: This tells Webpack to not try and bundle the 'bcrypt' package.
    config.externals.push('bcrypt');
    
    // This part handles other native modules if they are ever needed. It's safe to keep.
    if (isServer) {
      config.externals.push('onnxruntime-node');
    }
    return config;
  },
};

export default nextConfig;
