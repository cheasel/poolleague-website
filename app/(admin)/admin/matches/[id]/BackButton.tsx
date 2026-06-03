'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BackButton() {
  const router = useRouter();
  const [backPath, setBackPath] = useState('/admin/matches');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPath = sessionStorage.getItem('lastMatchesPath');
      // Ensure the saved path is indeed for the admin matches registry page
      if (savedPath && savedPath.startsWith('/admin/matches')) {
        setBackPath(savedPath);
      }
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(backPath);
  };

  return (
    <a
      href={backPath}
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" /> Back to Fixtures Registry
    </a>
  );
}
