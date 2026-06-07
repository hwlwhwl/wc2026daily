import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'World Cup 2026 Predictor',
  description: 'Predict the scores and compete with friends',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-white/10 bg-pitch-mid/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-14">
            <a href="/" className="font-bold text-lg tracking-tight text-gold-light">
              ⚽ WC2026 Predictor
            </a>
            <div className="flex gap-4 ml-auto text-sm text-slate-300">
              <a href="/predict" className="hover:text-white transition-colors">Predict</a>
              <a href="/dashboard" className="hover:text-white transition-colors">Leaderboard</a>
              <a href="/admin" className="hover:text-white transition-colors opacity-50">Admin</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
