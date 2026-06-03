'use client';

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SeasonSelector({ 
  seasons, 
  selectedSeasonId 
}: { 
  seasons: { id: number; name: string }[];
  selectedSeasonId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSeasonChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('seasonId', val);
    } else {
      params.delete('seasonId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">Filter By Season:</label>
      <div className="relative">
        <select
          value={selectedSeasonId || ""}
          onChange={(e) => handleSeasonChange(e.target.value)}
          className="w-full sm:w-44 p-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs appearance-none pr-10 cursor-pointer shadow-inner"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">
              {s.name}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
      </div>
    </div>
  );
}
