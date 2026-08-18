import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elenchus — The Socratic Dialectic on GenLayer',
  description:
    'A decentralized academic arena where hypotheses are cross-examined and refuted strictly through web-grounded evidence. Powered by GenLayer intelligent contracts.',
  keywords: ['Elenchus', 'GenLayer', 'socratic', 'dialectic', 'intelligent contracts', 'fact-check', 'evidence', 'decentralized coliseum'],
  openGraph: {
    title: 'Elenchus Dialectic Arena',
    description: 'Fact-Adjudicated Socratic duels powered by GenLayer VM.',
    type: 'website',
    siteName: 'Elenchus',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="bg-image" aria-hidden="true" />
        <div className="bg-overlay" aria-hidden="true" />
        <div className="grid-bg" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
