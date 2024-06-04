/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
    },
    // output: "standalone",
    reactStrictMode: true,
    env: {
        API_KEY_BITRIX: process.env.API_KEY_BITRIX,
    }
};

export default nextConfig;