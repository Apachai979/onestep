/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
                port: "",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                port: "",
            },
        ],
    },
    // output: "standalone",
    reactStrictMode: true,
    env: {
        API_KEY_BITRIX: process.env.API_KEY_BITRIX,
    },
}

export default nextConfig
