'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, Calendar, BarChart3 } from 'lucide-react';

export default function PublicNavbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Standings', href: '/standings', icon: Trophy },
    { name: 'Players', href: '/players', icon: Users },
    { name: 'Matches', href: '/matches', icon: Calendar },
  ];

  return (
    // 🎯 CHANGED: Converted white transparency container to glassmorphic dark arena profile
    <nav className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* 🎯 CHANGED: Tweaked logo accent block border colors for high contrast */}
            <div className="bg-slate-900 p-1.5 rounded-lg group-hover:bg-indigo-600 border border-slate-800 transition-colors">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {/* 🎯 CHANGED: Swapped slate-900 logo text to crisp white */}
            <span className="font-black text-white uppercase tracking-tighter text-lg">
              Pool<span className="text-indigo-400">League</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // 🎯 CHANGED: Swapped light active/hover states out for tailored arena dark styles
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Admin Quick Link */}
          <Link 
            href="/admin/matches" 
            // 🎯 CHANGED: Adapted buttons border color rules to prevent disappearing on dark background
            className="text-[10px] font-black text-slate-400 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-950 hover:border-white transition-all uppercase tracking-widest"
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}