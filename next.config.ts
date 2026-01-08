import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 处理符号链接的外部包
  transpilePackages: ['zsxq-sdk'],

  // 服务器端外部模块
  serverExternalPackages: ['better-sqlite3'],

  // Webpack 配置
  webpack: (config) => {
    // 解析符号链接
    config.resolve.symlinks = true;

    // 添加 zsxq-sdk 的路径别名
    config.resolve.alias = {
      ...config.resolve.alias,
      'zsxq-sdk': path.resolve(__dirname, '../zsxq-sdk/packages/typescript'),
    };

    return config;
  },

  // Turbopack 配置（备用）
  turbopack: {},
};

export default nextConfig;
