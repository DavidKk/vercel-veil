import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      resourceQuery: /raw/,
      use: 'raw-loader',
    })
    config.module.rules.push({
      test: /\.hbs$/,
      resourceQuery: /raw/,
      use: 'raw-loader',
    })
    return config
  },
}

export default nextConfig
