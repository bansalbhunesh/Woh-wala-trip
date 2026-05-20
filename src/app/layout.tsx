import { TRPCProvider } from '@/lib/trpc/provider';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { RevealObserver } from '@/components/providers/RevealObserver';
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

// Absolute URLs are required by OG scrapers. NEXT_PUBLIC_SITE_URL is the
// authoritative production URL; fall back to yaarlore.app to match the README.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yaarlore.app';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Yaarlore',
  },
  openGraph: {
    title: "Yaarlore — Your Friend Group's Trip Documentary",
    description:
      "Upload your trip photos → AI generates character roles, chaos scores, trip eras, and a cinematic story you'll actually want to share.",
    type: 'website',
    url: SITE_URL,
    siteName: 'Yaarlore',
    images: [
      {
        // 1:1 brand poster — works in WhatsApp, iMessage, Twitter, and most
        // OG scrapers. Square aspect renders cleanly across platforms even
        // though some (Twitter summary_large_image) prefer landscape.
        url: OG_IMAGE,
        width: 1254,
        height: 1254,
        alt: 'Yaarlore — Every trip becomes legend',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: "Yaarlore — Your Friend Group's Trip Documentary",
    description:
      "AI turns your trip photos into a cinematic documentary. India's first AI friendship mythology platform.",
    images: [OG_IMAGE],
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
  // maximumScale removed — locking zoom violates WCAG 1.4.4 and provides no
  // real benefit. iOS Safari will still respect the cinematic layout.
  // viewportFit=cover enables safe-area-inset-* CSS env vars (iPhone notch/home bar).
  viewportFit: 'cover' as const,
  themeColor: '#FF4D4D',
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
        {/* Skip to main content — WCAG 2.4.1: keyboard users can bypass navigation */}
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <TRPCProvider>
          <PostHogProvider>
            <ToastProvider>
              {/* id="main-content" is the skip-link anchor target.
                  Pages define their own <main> landmark internally;
                  we just need this id to exist as a jump target. */}
              <div id="main-content">{children}</div>
              <RevealObserver />
            </ToastProvider>
          </PostHogProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
