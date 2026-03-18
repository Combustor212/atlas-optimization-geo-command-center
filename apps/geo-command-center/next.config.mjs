/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Externalize heavy server-only packages to avoid bundling issues.
  // openai uses Node.js-specific APIs (streams, http) that break in edge/webpack.
  experimental: {
    serverComponentsExternalPackages: [
      '@supabase/supabase-js',
      '@supabase/ssr',
      'openai',
    ],
  },
  // Disable webpack cache to avoid ENOENT/rename failures (e.g. on synced folders)
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
