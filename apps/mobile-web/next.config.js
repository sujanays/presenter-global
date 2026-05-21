const { existsSync } = require('fs');
const path = require('path');
const { loadRootEnv } = require('../../config/loadRootEnv.cjs');

let dir = __dirname;
for (let i = 0; i < 10; i++) {
  const loaderPath = path.join(dir, 'config/loadRootEnv.cjs');
  if (existsSync(loaderPath)) {
    loadRootEnv(__dirname);
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
