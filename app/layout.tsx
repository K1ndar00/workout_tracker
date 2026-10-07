import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: '筋トレ記録アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
