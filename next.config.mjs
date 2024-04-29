/** @type {import('next').NextConfig} */
const nextConfig = {
   output: 'export',
    reactStrictMode: true,
    env: {
        API_KEY_BITRIX: process.env.API_KEY_BITRIX,
    }
};

export default nextConfig;