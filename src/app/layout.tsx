import { TRPCProvider } from '@/lib/trpc/provider';
import './globals.css';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'Woh Wala Trip',
  description: 'Your trips, narrated.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased bg-[#FAF8F4] text-[#1a1a1a]">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
