import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudStream — Next-Gen Cloud Video Platform',
  description: 'Enterprise-grade light-mode cloud video hosting, chunked 7.5GB upload engine, universal format streaming, and multi-language audio & subtitles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7FAFF] text-[#172B4D] min-h-screen antialiased selection:bg-[#EAF4FF] selection:text-[#2196F3]">
        {children}
      </body>
    </html>
  );
}
