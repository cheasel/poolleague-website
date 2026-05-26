'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TeamProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Team profile error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-slate-800 max-w-md w-full text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto bg-rose-950/40 rounded-2xl flex items-center justify-center border border-rose-900/30">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">Team Profile Unavailable</h2>
          <p className="text-sm text-slate-400">
            We couldn&apos;t load this team profile. This might be a temporary connection issue.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-500 transition-colors uppercase tracking-widest"
          >
            Try Again
          </button>
          <Link
            href="/standings"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Standings
          </Link>
        </div>
      </div>
    </div>
  );
}
