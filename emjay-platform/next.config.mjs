/** @type {import('next').NextConfig} */

// Static export so the demo hosts anywhere (Vercel, GitHub Pages, Netlify,
// Cloudflare Pages, or `npx serve out`) with no server runtime. For a GitHub
// Pages *project* site, set NEXT_PUBLIC_BASE_PATH at build time, e.g.:
//   NEXT_PUBLIC_BASE_PATH=/emjay-platform npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
