/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { isServer, webpack }) => {
    // Only add polyfills for client-side (browser) build
    if (!isServer) {
      // Add fallbacks for Web3Auth browser compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "react-native": false,
        "@react-native-async-storage/async-storage": false,
        "react-native-sqlite-storage": false,
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
        fs: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
      };

      // Provide global polyfills for browser only
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );
    }

    return config;
  },
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig;
