import { db } from "@/src/db";
import { matches, teams, divisions, seasons, matchGames } from "@/src/db/schema";
import { eq, asc, desc, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Calendar, ClipboardCheck, Plus, Sliders, ArrowUpDown, CalendarDays, CheckCircle2 } from "lucide-react";
import DeleteButton from "@/components/delete-button";

interface PageProps {
  searchParams: Promise<{ division?: string; sort?: string }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;
  const currentSort = params.sort || "date_desc";

  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  const filteredTeamsList = activeDivId
    ? await db.select().from(teams).where(eq(teams.divisionId, activeDivId)).orderBy(asc(teams.name))
    : [];

  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  const getOrderByExpression = () => {
    switch (currentSort) {
      case "date_asc": return [asc(matches.matchDate), asc(matches.id)];
      case "status": return [asc(matches.status), desc(matches.matchDate)];
      default: return [desc(matches.matchDate), desc(matches.id)];
    }
  };

  const filteredMatches = activeDivId
    ? await db
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
        .where(eq(homeTeamsAlias.divisionId, activeDivId))
        .orderBy(...getOrderByExpression())
    : [];

  // =========================================================================
  // ACTIONS BLOCK WITH STANDINGS POINTS FIXES
  // =========================================================================
  async function createManualFixture(formData: FormData) {
    "use server";
    const homeTeamId = Number(formData.get("homeTeamId"));
    const awayTeamId = Number(formData.get("awayTeamId"));
    const matchDateStr = formData.get("matchDate") as string;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;

    await db.insert(matches).values({
      homeTeamId,
      awayTeamId,
      divisionId: activeDivId,
      matchDate: matchDateStr ? new Date(matchDateStr) : new Date(),
      status: "scheduled" as const,
      homeTeamScoreTotal: 0,
      awayTeamScoreTotal: 0,
    });

    revalidatePath("/admin/matches");
    revalidatePath("/");
  }

  async function deleteFixture(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));

    // A. Track teams before deleting the record row
    const [targetMatch] = await db.select().from(matches).where(eq(matches.id, id));
    
    // B. Erase child games and parent rows
    await db.delete(matchGames).where(eq(matchGames.matchId, id));
    await db.delete(matches).where(eq(matches.id, id));

    // C. Recount league stats for both teams since a match disappeared!
    if (targetMatch && targetMatch.homeTeamId && targetMatch.awayTeamId) {
      const affectedTeams = [targetMatch.homeTeamId, targetMatch.awayTeamId];
      
      for (const teamId of affectedTeams) {
        const remainingCompletedMatches = await db
          .select()
          .from(matches)
          .where(
            and(
              eq(matches.status, "completed"),
              or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
            )
          );

        let freshPointsTotal = 0;
        remainingCompletedMatches.forEach((m) => {
          const isHome = m.homeTeamId === teamId;
          const isWin = isHome 
            ? (m.homeTeamScoreTotal ?? 0) > (m.awayTeamScoreTotal ?? 0)
            : (m.awayTeamScoreTotal ?? 0) > (m.homeTeamScoreTotal ?? 0);
          if (isWin) freshPointsTotal += 2;
        });

        await db.update(teams).set({ points: freshPointsTotal }).where(eq(teams.id, teamId));
      }
    }
    
    // D. Invalidate all layouts
    revalidatePath("/");
    revalidatePath("/admin/matches");
    revalidatePath("/standings");
    revalidatePath("/teams");
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Header and Filter Ribbons Layout mapping remains identical to your current files */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Match Fixtures</h1>
          <p className="text-slate-500 font-medium text-xs">Manage match lists and standings triggers.</p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {allDivisions.map((div) => (
          <Link key={div.id} href={`/admin/matches?division=${div.id}&sort=${currentSort}`} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${activeDivId === div.id ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-200"}`}>
            {div.name}
          </Link>
        ))}
      </div>

      {/* Fixtures Admin Table Grid */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredMatches.map((match) => {
            const isCompleted = match.status === "completed";
            return (
              <div key={match.id} className="p-6 md:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:bg-slate-50/50 transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex items-center gap-3 font-black text-slate-900 uppercase text-sm tracking-tight">
                    <span className="min-w-[120px] text-right truncate">{match.homeTeamName}</span>
                    <span className={`px-2.5 py-1 text-xs rounded-xl border tabular-nums ${isCompleted ? 'bg-slate-900 text-indigo-400 border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {isCompleted ? `${match.homeTeamScoreTotal} - ${match.awayTeamScoreTotal}` : "VS"}
                    </span>
                    <span className="min-w-[120px] text-left truncate">{match.awayTeamName}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Link href={`/admin/matches/${match.id}/scorecard`} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase bg-indigo-600 text-white rounded-xl shadow-lg">
                    <ClipboardCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Scorecard</span>
                  </Link>
                  <DeleteButton id={match.id} action={deleteFixture} label="Match" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}