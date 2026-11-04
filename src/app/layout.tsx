import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TCT TriageCI • Noise-Pruned Failure Attribution Layer',
  description:
    'The intelligent, noise-pruned failure attribution layer for engineering teams shipping 5-50 times a day. Instant root-cause attribution, flakiness detection, and one-click remediation playbooks.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
