/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
      domains: ['kwszcrucycfuzgboakuq.supabase.co,image_url'], // กำหนดให้ Next.js โหลดรูปจาก Backend ได้

    },
  };
  
  module.exports = nextConfig;
  