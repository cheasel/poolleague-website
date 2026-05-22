import { db } from "@/src/db";
import { matches, teams, divisions } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft, Calendar, Shield, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

// FIXED: Define the strict Promise-based interface structure for Next.js 15
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminMatchDetailPage({ params }: PageProps) {
  // 1. Await the params Promise container before extracting variables
  const { id } = await params;
  const matchId = Number(id);

  // Set up aliases for joining the same table (teams) twice
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  // 2. Fetch match metadata with joined team and division contexts
  const [match] = await db
    .select({
      id: matches.id,
      matchDate: matches.date,
      status: matches.status,
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

  const isCompleted = match.status === "completed";

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
            {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "No Date Assigned"}
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
              isCompleted ? 'bg-slate-950 text-indigo-400 border-slate-800 drop-shadow-[0_0_15px_rgba(129,140,248,0.2)]' : 'bg-slate-950 text-slate-700 border-slate-900'
            }`}>
              {isCompleted ? `${match.homeTeamScoreTotal} : ${match.awayTeamScoreTotal}` : "VS"}
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
    </div>
  );
}