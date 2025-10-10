import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import { AppLayout } from '@/components/layout/app-layout';
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
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
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}