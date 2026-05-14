import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { TRPCProvider } from '@/lib/trpc/provider';
import './globals.css';

export const metadata = {
  title: 'Woh Wala Trip — AI Friendship Lore',
  description: 'Turn your trips and friendships into cinematic chaos lore.',
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
        <ClerkProvider>
          <header className="fixed top-0 right-0 p-4 z-50">
            <Show when="signed-out">
              <div className="flex gap-4">
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-2 bg-black text-white text-sm rounded-full font-medium hover:bg-gray-800 transition-all">Sign Up</button>
                </SignUpButton>
              </div>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          <TRPCProvider>{children}</TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
