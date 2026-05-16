import { db } from "@/src/db";
import { matches, teams, divisions, seasons } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Calendar, ClipboardCheck, Plus, Sliders, CalendarDays } from "lucide-react";
import DeleteButton from "@/components/delete-button";

export default async function AdminMatchesPage() {
  // 1. Fetch complete data structures for team identity mapping
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.name));
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  // 2. Aggregate all matches with full relational row fields
  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeamsAlias.name,
      awayTeamName: awayTeamsAlias.name,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
      divisionName: divisions.name,
    })
    .from(matches)
    .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
    .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
    .leftJoin(divisions, eq(homeTeamsAlias.divisionId, divisions.id))
    .orderBy(desc(matches.matchDate), desc(matches.id));

  // --- SERVER ACTIONS FOR BASIC OPERATIONS ---
  async function createManualFixture(formData: FormData) {
    "use server";
    const homeTeamId = Number(formData.get("homeTeamId"));
    const awayTeamId = Number(formData.get("awayTeamId"));
    const matchDateStr = formData.get("matchDate") as string;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;

    await db.insert(matches).values({
      homeTeamId,
      awayTeamId,
      matchDate: matchDateStr ? new Date(matchDateStr) : new Date(),
      status: "scheduled",
      homeTeamScoreTotal: 0,
      awayTeamScoreTotal: 0,
    });

    revalidatePath("/admin/matches");
  }

  async function deleteFixture(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(matches).where(eq(matches.id, id));
    
    revalidatePath("/admin/matches");
    revalidatePath("/standings");
  }

  // Fetch flat lists of teams for manual creator selection fields
  const selectionTeamsList = await db.select().from(teams).orderBy(asc(teams.name));
  const divMap = new Map(allDivisions.map(d => [d.id, d.name]));

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Match Fixtures</h1>
          <p className="text-slate-500 font-medium text-xs">Manage match lists, open digital score sheets, and monitor standings results.</p>
        </div>
        
        {/* Quick Link to the Automation Generator if you decide to build it next */}
        <Link 
          href="/admin/matches/generator" 
          className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white text-indigo-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          <Sliders className="w-4 h-4" /> Auto-Generate Schedule
        </Link>
      </header>

      {/* Manual Quick Fixture Registration Card */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Schedule Manual Fixture</h3>
        <form action={createManualFixture} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Home Club</label>
            <select 
              name="homeTeamId" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none text-slate-800 text-xs uppercase"
            >
              <option value="">Select Home Team...</option>
              {selectionTeamsList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.divisionId ? divMap.get(t.divisionId) : "No Division"})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Away Club</label>
            <select 
              name="awayTeamId" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none text-slate-800 text-xs uppercase"
            >
              <option value="">Select Away Team...</option>
              {selectionTeamsList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.divisionId ? divMap.get(t.divisionId) : "No Division"})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Match Date</label>
            <input 
              type="date"
              name="matchDate"
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-700"
            />
          </div>

          <div className="md:col-span-2">
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 h-[58px] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
              <Plus className="w-4 h-4 stroke-[3]" /> Add Match
            </button>
          </div>
        </form>
      </div>

      {/* Fixtures Admin Ledger Grid */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {allMatches.map((match) => {
            const isCompleted = match.status === "completed";
            const isLive = match.status === "live";

            return (
              <div key={match.id} className="p-6 md:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  
                  {/* Calendar/Status Date Icon Wrapper */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200/60 text-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block tracking-wider uppercase">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "No Date Specified"}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-500 tracking-tight uppercase block">
                        {match.divisionName || "Unassigned Division"}
                      </span>
                    </div>
                  </div>

                  {/* Competitors Versus Scoring Cluster */}
                  <div className="flex items-center gap-3 font-black text-slate-900 uppercase text-sm tracking-tight">
                    <span className="min-w-[120px] text-right truncate">{match.homeTeamName || "Home Team"}</span>
                    
                    <span className={`px-2.5 py-1 text-xs rounded-xl tabular-nums tracking-widest border shadow-inner ${
                      isCompleted ? 'bg-slate-900 text-indigo-400 border-slate-900' :
                      isLive ? 'bg-amber-500 text-white border-amber-500 animate-pulse' :
                               'bg-slate-50 text-slate-400 border-slate-200/80'
                    }`}>
                      {isCompleted ? `${match.homeTeamScoreTotal} - ${match.awayTeamScoreTotal}` : "VS"}
                    </span>
                    
                    <span className="min-w-[120px] text-left truncate">{match.awayTeamName || "Away Team"}</span>
                  </div>
                </div>

                {/* Dashboard Action Triggers Column */}
                <div className="flex items-center justify-end gap-3 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                  
                  {/* LINK TARGET ANCHOR DIRECTLY TO COMPLETED FRAME SCORECARD ENGINE */}
                  <Link
                    href={`/admin/matches/${match.id}/scorecard`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Scorecard</span>
                  </Link>

                  <DeleteButton id={match.id} action={deleteFixture} label="Match" />
                </div>
              </div>
            );
          })}

          {allMatches.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic text-xs">
              No league match fixtures discovered in the current schedule matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}