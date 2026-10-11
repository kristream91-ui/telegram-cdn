/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // plain <img> is used on purpose: thumbnails come from the Python API
  // (which 302-redirects YouTube thumbs) and from i.ytimg.com
  images: { unoptimized: true },
};
export default nextConfig;
