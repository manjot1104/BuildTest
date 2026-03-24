/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    "@axe-core/puppeteer",
    "axe-core",
    "pdf-parse",
  ],
  // Increase memory limits for large files
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Create a separate chunk for templates
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