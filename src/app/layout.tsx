import { TRPCProvider } from '@/lib/trpc/provider';
import './globals.css';

export const metadata = {
  title: 'Woh Wala Trip',
  description: 'Your trips, narrated.',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
