import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Orbitron } from 'next/font/google';
import { AppProvider } from '@/components/providers/app-provider';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap', weight: ['300', '400', '500', '600', '700'] });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400', '500', '600', '700', '800', '900'] });

export const metadata: Metadata = {
  title: 'Veronica AI — Intelligent Transit Operations',
  description: 'AI-powered transit intelligence, fleet operations, and passenger-first recommendations for modern public transport.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' data-theme='lava' className={`${spaceGrotesk.variable} ${orbitron.variable}`}>
      <body className='font-sans'>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
