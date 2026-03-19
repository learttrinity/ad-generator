/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native Node.js binaries out of the webpack bundle.
  // sharp and @resvg/resvg-js are native modules — webpack can't parse them.
  // In Next.js 14.x this lives under experimental.
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp"],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Belt-and-suspenders: also mark as externals so webpack never tries to
      // bundle the native .node binaries directly.
      const existing = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...existing, "@resvg/resvg-js"];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
