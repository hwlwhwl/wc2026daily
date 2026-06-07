import Link from 'next/link';

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pitch-dark text-white">
      <nav className="bg-pitch-mid border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/daily" className="text-lg font-bold text-white hover:text-green-400 transition-colors">
            WC2026 Daily
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/daily/pick"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Pick
            </Link>
            <Link
              href="/daily/board"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/daily/admin"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
