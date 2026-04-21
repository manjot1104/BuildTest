import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  // Parent folders may contain another lockfile (e.g. D:\Users\Dell\ReactNative\package-lock.json).
  // Pin tracing / workspace inference to this app so PostCSS and deps resolve from this directory.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
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