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
  title: "Yaarlore — Your Friend Group's Trip Documentary",
  description:
    "AI turns your trip photos into a cinematic documentary. Character roles, chaos scores, and a story worth sharing. India's first AI friendship mythology platform.",
  keywords: [
    'trip documentary',
    'AI travel memories',
    'friend group stories',
    'India travel app',
    'chaos score',
    'yaarlore',
    'trip lore',
    'friendship mythology',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
  openGraph: {
    title: "Yaarlore — Your Friend Group's Trip Documentary",
    description:
      "Upload your trip photos → AI generates character roles, chaos scores, trip eras, and a cinematic story you'll actually want to share.",
    type: 'website',
    url: 'https://yaarlore.com',
    siteName: 'Yaarlore',
    images: [
      {
        url: 'https://yaarlore.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Yaarlore — AI Trip Documentary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: "Yaarlore — Your Friend Group's Trip Documentary",
    description:
      "AI turns your trip photos into a cinematic documentary. India's first AI friendship mythology platform.",
    images: ['https://yaarlore.com/og-image.png'],
    creator: '@yaarlore',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
