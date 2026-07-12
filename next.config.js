/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Cloudflare 专用模块不在 Node 环境
    config.externals = config.externals || [];
    config.externals.push("cloudflare:workers");
    // bcryptjs 内部引用了 crypto，由 Cloudflare Workers 运行时提供
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback.crypto = false;
    }
    return config;
  },
};

module.exports = nextConfig;
