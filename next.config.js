/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    
    // Don't bundle pdf-parse on server side - use Node.js require
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }
    
    return config;
  },
};

export default config;