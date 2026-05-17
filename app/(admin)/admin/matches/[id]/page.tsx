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
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
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
    <div className="space-y-8 max-w-4xl mx-auto pb-16 px-4">
      <header>
        <Link 
          href="/admin/matches" 
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fixtures Registry
        </Link>
      </header>

      {/* MATCH SUMMARY DISPLAY CARD */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Match Overview</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                {match.divisionName || "General Division"} Tier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60">
            <Calendar className="w-4 h-4 text-slate-400" />
            {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "No Date Assigned"}
          </div>
        </div>

        {/* COMPACT INTERACTIVE VISUAL SCOREBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center text-center py-4">
          <div className="md:col-span-3 md:text-right space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Home Club</span>
            <span className="text-xl font-black text-slate-900 uppercase tracking-tight block truncate">{match.homeTeamName || "Home Team"}</span>
          </div>

          <div className="md:col-span-1 mx-auto">
            <div className={`px-4 py-2 text-md rounded-2xl border font-black tracking-widest tabular-nums shadow-inner min-w-[90px] ${
              isCompleted ? 'bg-slate-950 text-indigo-400 border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {isCompleted ? `${match.homeTeamScoreTotal} - ${match.awayTeamScoreTotal}` : "VS"}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mt-1.5">{match.status}</span>
          </div>

          <div className="md:col-span-3 md:text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Away Club</span>
            <span className="text-xl font-black text-slate-900 uppercase tracking-tight block truncate">{match.awayTeamName || "Away Team"}</span>
          </div>
        </div>

        <div className="flex items-center justify-center pt-4">
          <Link
            href={`/admin/matches/${matchId}/scorecard`}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-md active:scale-95"
          >
            Open Live Digital Scorecard Panel
          </Link>
        </div>
      </section>
    </div>
  );
}