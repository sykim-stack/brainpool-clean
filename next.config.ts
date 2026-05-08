/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/supabase-js'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://grlfocvlfatuvphkyivd.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybGZvY3ZsZmF0dXZwaGt5aXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM0MzUzOSwiZXhwIjoyMDg1OTE5NTM5fQ.GRfwTmoSIluOWqfaFG093uM776V77h6NaEFhrl9eHr8', // ← 실제 서비스 롤 키로 교체
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybGZvY3ZsZmF0dXZwaGt5aXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDM1MzksImV4cCI6MjA4NTkxOTUzOX0.4dLzD1AYSuigxU_Q5ZZwZ6XDGejMvbuoYIjmB4D7dxo', // ← 실제 익명 키로 교체
    DEEPL_API_KEY: 'b7d91801-1316-448a-9896-dea29a271183:fx', // ← 실제 DeepL 키로 교체
  },
};

module.exports = nextConfig;