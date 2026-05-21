'use client';

import { useState } from 'react'; // 🎯 ADDED: React state hook for layout control
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, Calendar, BarChart3, Menu, X } from 'lucide-react'; // 🎯 ADDED: Responsive icon tokens

export default function PublicNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false); // 🎯 ADDED: Mobile disclosure tracking variable

  const navItems = [
    { name: 'Standings', href: '/standings', icon: Trophy },
    { name: 'Players', href: '/players', icon: Users },
    { name: 'Matches', href: '/matches', icon: Calendar },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
            <div className="bg-slate-900 p-1.5 rounded-lg group-hover:bg-indigo-600 border border-slate-800 transition-colors">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white uppercase tracking-tighter text-lg">
              Pool<span className="text-indigo-400">League</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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

          {/* Desktop Admin Quick Link */}
          <div className="hidden md:block">
            <Link 
              href="/admin/matches" 
              className="text-[10px] font-black text-slate-400 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-950 hover:border-white transition-all uppercase tracking-widest"
            >
              Admin
            </Link>
          </div>

          {/* 🎯 ADDED: Responsive Mobile Trigger Button Container */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-colors border border-transparent hover:border-slate-800"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-5 w-5" /> : <Menu className="block h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 ADDED: Dropdown Mobile Route Navigation Panel Drawer */}
      <div 
        className={`md:hidden bg-slate-950 border-b border-slate-900 transition-all duration-200 ease-in-out ${
          isOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`} 
        id="mobile-menu"
      >
        <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)} // Close menu on route select
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
                  isActive 
                    ? 'bg-slate-900 text-white border-l-2 border-indigo-400' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
          
          <div className="pt-4 mt-2 border-t border-slate-900 px-4">
            <Link 
              href="/admin/matches" 
              onClick={() => setIsOpen(false)}
              className="flex justify-center text-center text-xs font-black text-slate-400 border border-slate-800 px-3 py-3 rounded-xl hover:bg-white hover:text-slate-950 hover:border-white transition-all uppercase tracking-widest"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}