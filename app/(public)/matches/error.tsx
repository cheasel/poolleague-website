'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mx-auto w-16 h-16 bg-rose-950/40 border border-rose-900/30 rounded-2xl flex items-center justify-center shadow-inner">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">
            Fixtures <span className="text-rose-500">Unavailable</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We encountered an unexpected error while retrieving the matches data. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black uppercase tracking-widest text-[10px] py-4 px-6 rounded-xl transition-all shadow-lg shadow-indigo-900/30 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 active:scale-[0.98] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 px-6 rounded-xl transition-all shadow-inner"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
