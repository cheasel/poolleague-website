'use client';
import { useEffect, useState } from "react";
import { fetchTitleRaceData } from "@/src/app/actions";

interface Match {
  id: number;
  seasonId: number | null; // Changed from number to number | null
  divisionId: number | null; // Changed from number to number | null
  status: string | null;
}

export default function TitleRace({ divisionId, seasonId }: { divisionId: number, seasonId: number }) {
  const [data, setData] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTitleRaceData(seasonId, divisionId)
      .then((res) => {
        // Filter out any results that have a null seasonId if your logic requires a number
        const sanitizedData = res.filter(m => m.seasonId !== null) as Match[];
        setData(sanitizedData);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, [seasonId, divisionId]);

  if (loading) return <div className="p-4 text-xs text-slate-500 animate-pulse">Loading...</div>;

  return (
    <div className="p-4">
      <h3 className="text-white font-bold mb-2 uppercase text-[10px] tracking-widest">Title Race</h3>
      <div className="text-indigo-400 font-black text-2xl">{data.length}</div>
      <div className="text-slate-500 text-[10px] uppercase font-bold">Matches in Scope</div>
    </div>
  );
}