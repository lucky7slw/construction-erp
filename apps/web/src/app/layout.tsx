import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'HHHomes ERP',
    template: '%s | HHHomes ERP',
  },
  description: 'Construction Project Management & ERP System',
  keywords: [
    'construction',
    'project management',
    'ERP',
    'building',
    'contractors',
    'team management'
  ],
  authors: [{ name: 'HHHomes' }],
  creator: 'HHHomes',
  metadataBase: new URL('https://erp.hhhomes.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://erp.hhhomes.com',
    title: 'HHHomes ERP',
    description: 'Construction Project Management & ERP System',
    siteName: 'HHHomes ERP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HHHomes ERP',
    description: 'Construction Project Management & ERP System',
    creator: '@hhhomes',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HHHomes PM',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ea580c' },
    { media: '(prefers-color-scheme: dark)', color: '#ea580c' },
  ],
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <Providers>
          <AuthGuard>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}