import { db } from "@/db";
import { matches, teams, seasons } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import AddMatchForm from "./add-match-form";

export default async function MatchesPage() {
  // 1. Setup aliases for the Home/Away team join
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  // 2. Fetch matches with joined team names
  const allMatches = await db
    .select({
      id: matches.id,
      date: matches.matchDate,
      homeTeam: homeTeams.name,
      awayTeam: awayTeams.name,
      homeScore: matches.homeTeamScoreTotal,
      awayScore: matches.awayTeamScoreTotal,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .orderBy(asc(matches.matchDate));

  // 3. Data for the 'Add Match' dropdowns
  const teamOptions = await db.select().from(teams);
  const seasonOptions = await db.select().from(seasons);

  // 4. Server Action to create a new match
  async function scheduleMatch(formData: FormData) {
    "use server";
    const homeId = formData.get("homeTeamId");
    const awayId = formData.get("awayTeamId");

    if (homeId === awayId) return; // Basic validation check

    await db.insert(matches).values({
      seasonId: Number(formData.get("seasonId")),
      homeTeamId: Number(homeId),
      awayTeamId: Number(awayId),
      matchDate: new Date(formData.get("matchDate") as string),
      status: "scheduled",
    });

    revalidatePath("/admin/matches");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">League Schedule</h1>

      {/* Add Match Section */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-slate-700">Schedule a Match</h2>
        <AddMatchForm teams={teamOptions} seasons={seasonOptions} action={scheduleMatch} />
      </section>

      {/* Matches List Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-slate-700">Upcoming & Past Matches</h2>
        <div className="grid gap-3">
          {allMatches.map((m) => (
            <div 
              key={m.id} 
              className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-sm group hover:border-blue-200 transition-all"
            >
              <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
                {/* Date Display */}
                <div className="text-sm font-bold text-slate-400 min-w-[100px]">
                  {m.date ? new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "TBD"}
                </div>

                {/* Matchup & Score */}
                <div className="flex items-center gap-4 text-lg">
                  <span className={`font-bold ${m.status === 'completed' && (m.homeScore! > m.awayScore!) ? 'text-blue-600' : 'text-slate-900'}`}>
                    {m.homeTeam}
                  </span>
                  
                  <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1 font-mono font-black text-slate-600">
                    {m.status === 'completed' ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                  </div>

                  <span className={`font-bold ${m.status === 'completed' && (m.awayScore! > m.homeScore!) ? 'text-blue-600' : 'text-slate-900'}`}>
                    {m.awayTeam}
                  </span>
                </div>
              </div>

              {/* Actions & Status */}
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                  m.status === 'completed' 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {m.status}
                </span>
                
                <Link 
                  href={`/admin/matches/${m.id}`}
                  className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                >
                  {m.status === 'completed' ? 'Edit Score' : 'Enter Score'}
                </Link>

                <Link 
                  href={`/matches/${m.id}`} 
                  className="px-4 py-2 border-2 border-slate-100 hover:border-indigo-200 text-slate-400 hover:text-indigo-600 rounded-xl text-xs font-black transition-all uppercase tracking-widest"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}

          {allMatches.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              No matches found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}