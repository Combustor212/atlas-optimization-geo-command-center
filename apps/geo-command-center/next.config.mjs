/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Fix vendor-chunks MODULE_NOT_FOUND — externalize Supabase for server
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],
  },
  // Disable webpack cache to avoid ENOENT/rename failures (e.g. on synced folders)
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
