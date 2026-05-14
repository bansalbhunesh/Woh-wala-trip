import { TRPCProvider } from '@/lib/trpc/provider';
import { Inter, Playfair_Display, Syne, DM_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['italic', 'normal'],
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  display: 'swap',
});

export const metadata = {
  title: 'Woh Wala Trip — AI Friendship Lore',
  description: 'Turn your trips and friendships into cinematic chaos lore.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Woh Wala Trip',
    description: 'Your friendships, narrated.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#060604',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${syne.variable} ${inter.variable} ${dmMono.variable} antialiased`}>
      <body className="bg-[#060604] text-[#F5F0E8] overflow-x-hidden selection:bg-cooked-accent selection:text-white">
        {/* Cinematic Film Grain Overlay */}
        <div className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.045] mix-blend-overlay animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27noise%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23noise)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />
        
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
