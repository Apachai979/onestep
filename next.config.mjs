/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: 'dist',
    reactStrictMode: true,
    env: {
        API_KEY_BITRIX: process.env.API_KEY_BITRIX,
    }
};

export default nextConfig;