import { db } from "@/db";
import { matches, teams, seasons } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import AddMatchForm from "./add-match-form";

export default async function MatchesPage() {
  // 1. Create aliases so we can join the teams table twice
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  // 2. Fetch matches with joined team names
  const allMatches = await db
    .select({
      id: matches.id,
      date: matches.matchDate,
      homeTeam: homeTeams.name,
      awayTeam: awayTeams.name,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .orderBy(asc(matches.matchDate));

  // 3. Fetch options for the scheduling form
  const teamOptions = await db.select().from(teams);
  const seasonOptions = await db.select().from(seasons);

  // 4. Server Action to save the new match
  async function scheduleMatch(formData: FormData) {
    "use server";
    
    const homeId = formData.get("homeTeamId");
    const awayId = formData.get("awayTeamId");
    const seasonId = formData.get("seasonId");
    const dateStr = formData.get("matchDate") as string;
  
    // --- ADD THE VALIDATION HERE ---
    if (homeId === awayId) {
      // Instead of crashing the whole app with 'throw', 
      // we log it and return early for a smoother experience.
      console.error("Validation Error: A team cannot play against itself!");
      return; 
    }
    // -------------------------------
  
    await db.insert(matches).values({
      seasonId: Number(seasonId),
      homeTeamId: Number(homeId),
      awayTeamId: Number(awayId),
      matchDate: new Date(dateStr),
      status: "scheduled",
    });
  
    revalidatePath("/admin/matches");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Match Scheduler</h1>
        <p className="text-slate-500">Plan upcoming games and assign venues.</p>
      </header>

      {/* Form Section */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-slate-700">Schedule New Match</h2>
        <AddMatchForm 
          teams={teamOptions} 
          seasons={seasonOptions} 
          action={scheduleMatch} 
        />
      </section>

      {/* List Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-slate-700">Upcoming Schedule</h2>
        <div className="space-y-3">
          {allMatches.map((m) => (
            <div 
              key={m.id} 
              className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-sm hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12 w-full">
                {/* Date Display */}
                <div className="flex flex-col items-center md:items-start min-w-[120px]">
                  <span className="text-xs font-bold uppercase text-slate-400">Date</span>
                  <span className="text-sm font-medium text-slate-700">
                    {m.date ? new Date(m.date).toLocaleDateString(undefined, { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : "TBD"}
                  </span>
                </div>

                {/* Matchup */}
                <div className="flex items-center justify-center flex-1 text-center md:text-left">
                  <div className="text-lg font-bold text-slate-900 w-full md:w-48 text-right">
                    {m.homeTeam}
                  </div>
                  <div className="mx-4 px-3 py-1 rounded bg-slate-100 text-slate-500 text-xs font-black">
                    VS
                  </div>
                  <div className="text-lg font-bold text-slate-900 w-full md:w-48 text-left">
                    {m.awayTeam}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-4 md:mt-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest border border-indigo-100">
                  {m.status}
                </span>
              </div>
            </div>
          ))}

          {allMatches.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              No matches scheduled yet. Use the form above to start your season!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}