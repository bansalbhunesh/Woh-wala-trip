import { TRPCProvider } from '@/lib/trpc/provider';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { Bricolage_Grotesque, Nunito, Fira_Mono } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz', 'wdth'],
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const firaMono = Fira_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Yaarlore — AI Friendship Lore',
  description: 'Turn your trips and friendships into cinematic chaos lore.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'Yaarlore',
    description: "Your yaar group's lore, documented.",
    type: 'website',
    images: [{ url: '/icon.png' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FAF8F3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bricolage.variable} ${nunito.variable} ${firaMono.variable} antialiased`}
    >
      <body
        className="overflow-x-hidden"
        style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}
      >
        <TRPCProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
