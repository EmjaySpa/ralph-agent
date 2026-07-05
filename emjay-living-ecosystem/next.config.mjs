/** @type {import('next').NextConfig} */

// Static export so the demo can be hosted anywhere (GitHub Pages, Netlify,
// Vercel, Cloudflare Pages, or just `npx serve out`) with no server runtime.
// When deploying to a GitHub Pages *project* site the app is served from a
// sub-path (e.g. /emjay-living-ecosystem). Set NEXT_PUBLIC_BASE_PATH at build
// time to make asset/links resolve correctly, e.g.:
//   NEXT_PUBLIC_BASE_PATH=/emjay-living-ecosystem npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
