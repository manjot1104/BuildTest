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
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        "puppeteer",
        "puppeteer-core",
        "@sparticuz/chromium",
        "@axe-core/puppeteer",
        "axe-core",
      );
    }
    return config;
  },
};

export default config;