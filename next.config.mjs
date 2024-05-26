/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: "standalone",
    reactStrictMode: true,
    env: {
        API_KEY_BITRIX: process.env.API_KEY_BITRIX,
    }
};

export default nextConfig;