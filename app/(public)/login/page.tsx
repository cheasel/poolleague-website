"use client";

import { useState } from "react";
import { loginAction } from "@/src/app/auth-actions";
import { Lock, Mail, ArrowRight, Zap, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error — this is expected on success
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-900/60 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-indigo-950/40 mx-auto">
            <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" /> Secure
            Access Portal
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Lanna Pool
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
              Club
            </span>
          </h1>
          <p className="text-slate-500 font-medium text-xs">
            Sign in to the League Management Hub to access the admin dashboard.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-800 shadow-2xl p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Card Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/60">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">
                  Admin Authentication
                </h2>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Credential Entry
                </span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 bg-rose-950/30 border border-rose-900/40 rounded-xl px-4 py-3 text-rose-400 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@lannapoolclub.com"
                    required
                    autoComplete="email"
                    className="w-full p-3.5 pl-11 bg-slate-950 border border-slate-800 rounded-xl font-bold text-sm text-white outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full p-3.5 pl-11 bg-slate-950 border border-slate-800 rounded-xl font-bold text-sm text-white outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard{" "}
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-indigo-400 transition-colors"
          >
            ← Return to Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}
