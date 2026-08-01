import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neura Report',
  description: 'Your personal brain performance report by Neura',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neura-bg text-neura-text antialiased">{children}</body>
    </html>
  );
}
