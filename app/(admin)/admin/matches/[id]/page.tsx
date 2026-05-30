import { db } from "@/src/db";
import { matches, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft, Calendar, Shield, Trophy, Edit, Save } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminMatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = Number(id);

  // Set up aliases for joining the same table (teams) twice
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  // 1. Fetch match metadata with joined team and division contexts
  const [match] = await db
    .select({
      id: matches.id,
      matchDate: matches.date,
      status: matches.status,
      weekNumber: matches.weekNumber,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamScoreTotal: matches.homeScore,
      awayTeamScoreTotal: matches.awayScore,
      homeTeamName: homeTeamsAlias.name,
      awayTeamName: awayTeamsAlias.name,
      divisionName: divisions.name,
    })
    .from(matches)
    .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
    .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
    .leftJoin(divisions, eq(homeTeamsAlias.divisionId, divisions.id))
    .where(eq(matches.id, matchId));

  if (!match) {
    return (
      <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 italic text-xs">
        Match fixture record not found.
      </div>
    );
  }

  // 2. Fetch all teams to populate the select inputs when editing
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  const isCompleted = match.status === "completed";

  // Helper to format Date for datetime-local input (YYYY-MM-DDTHH:mm)
  function formatDateTimeLocal(date: Date | null): string {
    if (!date) return "";
    const d = new Date(date);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  // --- MUTATION: UPDATE MATCH DETAILS ---
  async function updateMatchDetails(formData: FormData) {
    "use server";
    const homeId = Number(formData.get("homeTeamId"));
    const awayId = Number(formData.get("awayTeamId"));
    const week = Number(formData.get("weekNumber"));
    const dateStr = formData.get("matchDate") as string;
    const statusVal = formData.get("status") as string;

    if (!homeId || !awayId || !dateStr || !statusVal) return;

    await db.update(matches)
      .set({
        homeTeamId: homeId,
        awayTeamId: awayId,
        weekNumber: week,
        date: new Date(dateStr),
        status: statusVal,
      })
      .where(eq(matches.id, matchId));

    revalidatePath(`/admin/matches/${matchId}`);
    revalidatePath("/admin/matches");
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 px-4 text-slate-200">
      <header>
        <Link 
          href="/admin/matches" 
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fixtures Registry
        </Link>
      </header>

      {/* MATCH SUMMARY DISPLAY CARD */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800 shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Match Overview</h1>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                {match.divisionName || "General Division"} Tier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-[0.2em] bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <Calendar className="w-4 h-4 text-slate-600" />
            {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "No Date Assigned"}
          </div>
        </div>

        {/* COMPACT INTERACTIVE VISUAL SCOREBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center text-center py-4 relative z-10">
          <div className="md:col-span-3 md:text-right space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block">Home Club</span>
            <span className="text-xl md:text-2xl font-black text-white uppercase tracking-tight block truncate">{match.homeTeamName || "Home Team"}</span>
          </div>

          <div className="md:col-span-1 mx-auto">
            <div className={`px-4 py-2 text-lg rounded-2xl border font-black tracking-widest tabular-nums shadow-2xl min-w-[100px] ${
              isCompleted || match.status === 'live' ? 'bg-slate-950 text-indigo-400 border-slate-800 drop-shadow-[0_0_15px_rgba(129,140,248,0.2)]' : 'bg-slate-950 text-slate-700 border-slate-900'
            }`}>
              {isCompleted || match.status === 'live' ? `${match.homeTeamScoreTotal} : ${match.awayTeamScoreTotal}` : "VS"}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block mt-2">{match.status}</span>
          </div>

          <div className="md:col-span-3 md:text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block">Away Club</span>
            <span className="text-xl md:text-2xl font-black text-white uppercase tracking-tight block truncate">{match.awayTeamName || "Away Team"}</span>
          </div>
        </div>

        <div className="flex items-center justify-center pt-4 relative z-10">
          <Link
            href={`/admin/matches/${matchId}/scorecard`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
          >
            Open Live Digital Scorecard Panel
          </Link>
        </div>
      </section>

      {/* EDIT MATCH DETAILS FORM */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-400 border border-slate-800 shadow-inner">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Edit Match Details</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mt-0.5">
              Update matchup, scheduling timestamp, or status
            </p>
          </div>
        </div>

        <form action={updateMatchDetails} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            
            {/* Home Team */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Home Club</label>
              <select 
                name="homeTeamId" 
                defaultValue={match.homeTeamId || ""}
                required 
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
              >
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Away Team */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Away Club</label>
              <select 
                name="awayTeamId" 
                defaultValue={match.awayTeamId || ""}
                required 
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
              >
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Week Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Week Number</label>
              <input 
                name="weekNumber" 
                type="number" 
                min="1"
                defaultValue={match.weekNumber || 1}
                required 
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-indigo-500 transition-all shadow-inner" 
              />
            </div>

            {/* Match Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Match Date & Time</label>
              <input 
                name="matchDate" 
                type="datetime-local" 
                defaultValue={formatDateTimeLocal(match.matchDate)}
                required 
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-indigo-500 transition-all shadow-inner" 
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Match Status</label>
              <select 
                name="status" 
                defaultValue={match.status || "scheduled"}
                required 
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Match Details
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}