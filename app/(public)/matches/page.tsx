import { db } from "@/src/db";
import { matches, teams, seasons, divisions } from "@/src/db/schema";
import { eq, sql, desc, asc, and } from "drizzle-orm";
import MatchPageClient from "./MatchPageClient";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
    sort?: "asc" | "desc";
  }>;
}

const getCachedSeasons = unstable_cache(
  async () => {
    return db.select().from(seasons).orderBy(desc(seasons.startDate));
  },
  ["seasons-list"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisions = unstable_cache(
  async () => {
    return db
      .select({
        id: divisions.id,
        name: divisions.name,
        seasonId: divisions.seasonId,
      })
      .from(divisions)
      .orderBy(divisions.tier);
  },
  ["divisions-list"],
  { revalidate: 300, tags: ["divisions"] }
);

const getCachedMatchesData = (
  selectedSeasonId: number | null,
  selectedDivisionId: number | null,
  sortDirection: "asc" | "desc"
) => unstable_cache(
  async () => {
    const conditions = [];
    if (selectedSeasonId) {
      conditions.push(eq(matches.seasonId, selectedSeasonId));
    }
    if (selectedDivisionId) {
      conditions.push(eq(matches.divisionId, selectedDivisionId));
    }

    return db
      .select({
        id: matches.id,
        date: matches.date,
        status: matches.status,
        weekNumber: matches.weekNumber,
        homeTeamId: matches.homeTeamId,
        homeTeamName: sql<string>`home_teams.name`,
        awayTeamId: matches.awayTeamId,
        awayTeamName: sql<string>`away_teams.name`,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
      .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortDirection === "desc" ? desc(matches.date) : asc(matches.date));
  },
  ["matches-list-data", String(selectedSeasonId), String(selectedDivisionId), sortDirection],
  { revalidate: 60, tags: ["matches", "teams"] }
)();

export default async function PublicMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch lookup criteria sequentially to prevent deadlock
  const allSeasons = await getCachedSeasons();
  const allDivisions = await getCachedDivisions();

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);

  // Filter divisions to only show the ones belonging to the selected season
  const seasonDivisions = allDivisions.filter(d => d.seasonId === selectedSeasonId);

  let selectedDivisionId = params.divisionId ? Number(params.divisionId) : null;
  if (!selectedDivisionId || !seasonDivisions.some(d => d.id === selectedDivisionId)) {
    selectedDivisionId = seasonDivisions[0]?.id || null;
  }
  
  // 🎯 Default sorting direction to 'asc' if not explicitly defined in URL
  const sortDirection = params.sort === "desc" ? "desc" : "asc";

  // 3. Query dataset with sorting order applied dynamically
  const allMatchesRaw = await getCachedMatchesData(selectedSeasonId, selectedDivisionId, sortDirection);

  // 4. Format structural attributes safely
  const formattedMatches = allMatchesRaw.map((m) => ({
    id: m.id,
    date: m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "TBD",
    status: m.status || "scheduled",
    weekNumber: m.weekNumber || 1,
    homeTeam: m.homeTeamName || "Home Team",
    awayTeam: m.awayTeamName || "Away Team",
    homeScore: m.homeScore !== null ? Number(m.homeScore) : null,
    awayScore: m.awayScore !== null ? Number(m.awayScore) : null,
  }));

  const completedResults = formattedMatches.filter((m) => m.status === "completed");
  const upcomingFixtures = formattedMatches.filter((m) => m.status !== "completed");

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">League Dashboard</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Schedules</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Browse real-time competitive timelines, frame records, and team fixtures.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
            Loading match schedules...
          </div>
        }>
          <MatchPageClient 
            upcomingFixtures={upcomingFixtures}
            completedResults={completedResults}
            seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
            divisions={seasonDivisions.map(d => ({ id: d.id, name: d.name }))}
            selectedSeasonId={selectedSeasonId || undefined}
            selectedDivisionId={selectedDivisionId || undefined}
            sortDirection={sortDirection}
          />
        </Suspense>
      </div>
    </div>
  );
}