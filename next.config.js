/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra-plugin",
    "clone-deep",
    "merge-deep",
    "@sparticuz/chromium",
    "@axe-core/puppeteer",
    "axe-core",
    "pdf-parse",
    "@remotion/bundler",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            templates: {
              name: 'templates',
              chunks: 'all',
              test: /[\\/]templates\.ts$/,
              priority: 20,
            },
          },
        },
      };
    }
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        "puppeteer",
        "puppeteer-core",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin",
        "clone-deep",
        "merge-deep",
        "@sparticuz/chromium",
        "@axe-core/puppeteer",
        "axe-core",
        "pdf-parse",
      );
    }
    return config;
  },
};

export default config;