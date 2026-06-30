/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Airtable attachment URLs are served from these hosts
    remotePatterns: [
      { protocol: "https", hostname: "**.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
    ],
  },
};

module.exports = nextConfig;
