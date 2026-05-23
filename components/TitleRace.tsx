'use client';
import { useEffect, useState } from "react";
import { fetchTitleRaceData } from "@/src/app/actions";

// Define the shape of your data clearly
export default function TitleRace({ divisionId, seasonId }: { divisionId: number, seasonId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchTitleRaceData(seasonId, divisionId);
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
      }
    }
    
    loadData();
    return () => { isMounted = false; };
  }, [seasonId, divisionId]);

  if (loading) return <div className="p-4 text-xs text-slate-500">Loading Title Race...</div>;

  return (
    <div className="p-4">
      <h3 className="text-white font-bold mb-2">Title Race</h3>
      <div className="text-slate-400 text-xs">
        {data.length > 0 ? `${data.length} matches tracked` : "No matches found."}
      </div>
    </div>
  );
}
