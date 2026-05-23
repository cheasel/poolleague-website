import { db } from "@/src/db";
import { seasons, divisions } from "@/src/db/schema";
import { desc } from "drizzle-orm";
import dynamic from 'next/dynamic';

// Lazy-load the widget to keep the initial JS bundle small
const TitleRace = dynamic(() => import('@/components/TitleRace'), {
  ssr: true,
  loading: () => <div className="p-4 text-xs animate-pulse">Loading Widget...</div>
});

export default async function PublicHomePage() {
  // Parallelize fetches: TBT will drop significantly
  const [currentSeasons, currentDivisions] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1),
    db.select().from(divisions).orderBy(desc(divisions.tier)).limit(1)
  ]);

  const activeSeasonId = currentSeasons[0]?.id || 1;
  const activeDivisionId = currentDivisions[0]?.id || 1;

  return (
    <main className="min-h-screen bg-slate-950">
      {/* ... rest of your layout ... */}
      
      <TitleRace 
        divisionId={activeDivisionId} 
        seasonId={activeSeasonId} 
      />
    </main>
  );
}