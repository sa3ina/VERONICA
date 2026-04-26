import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProvider } from '@/components/providers/app-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Veronica AI — Intelligent Transit Operations',
  description: 'AI-powered transit intelligence, fleet operations, and passenger-first recommendations for modern public transport.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' data-theme='midnight' className={inter.variable}>
      <body className='font-sans'>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
