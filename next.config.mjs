/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.0.107'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hvkgcmgqelczdnvhxtrj.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        // Full path wildcard is required because Pexels photo URLs vary by ID.
        // The storefront only uses Pexels for fallback stock images when a
        // product has no uploaded media.
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;