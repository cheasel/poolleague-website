import { db } from "@/src/db";
import { matches, matchGames, players, teams } from "@/src/db/schema";
import { eq, asc, desc, or, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Save, Plus, ShieldCheck, Trash2, User, Users as UsersIcon } from "lucide-react";

// =========================================================================
// 1. TOP-LEVEL UTILITY: BULLETPROOF LEAGUE STANDINGS SYNC ENGINE
// =========================================================================
async function syncMatchTotals(targetMatchId: number) {
  // A. Fetch the match info to find out which two teams are playing
  const [currentMatch] = await db.select().from(matches).where(eq(matches.id, targetMatchId));
  if (!currentMatch || !currentMatch.homeTeamId || !currentMatch.awayTeamId) return;

  // B. Fetch all current frames for this specific match to calculate the scorecard total
  const freshGamesList = await db.select().from(matchGames).where(eq(matchGames.matchId, targetMatchId));
  
  let homeMatchWins = 0;
  let awayMatchWins = 0;

  freshGamesList.forEach((g) => {
    if ((g.player1Score ?? 0) === 0 && (g.player2Score ?? 0) === 0) return; 
    if ((g.player1Score ?? 0) > (g.player2Score ?? 0)) homeMatchWins++;
    else if ((g.player2Score ?? 0) > (g.player1Score ?? 0)) awayMatchWins++;
  });

  // C. Update the parent match fixture scorecard totals
  await db
    .update(matches)
    .set({
      homeTeamScoreTotal: homeMatchWins,
      awayTeamScoreTotal: awayMatchWins,
      status: freshGamesList.length > 0 ? "completed" : "scheduled", 
    })
    .where(eq(matches.id, targetMatchId));

  // D. RECOUNT TOTAL LEAGUE STANDINGS POINTS FOR BOTH TEAMS
  const targetTeamIds = [currentMatch.homeTeamId, currentMatch.awayTeamId];

  for (const teamId of targetTeamIds) {
    // Get every completed match this team has played this season
    const allTeamMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
        )
      );

    let totalPoints = 0;

    allTeamMatches.forEach((m) => {
      const isHome = m.homeTeamId === teamId;
      const isWin = isHome 
        ? (m.homeTeamScoreTotal ?? 0) > (m.awayTeamScoreTotal ?? 0)
        : (m.awayTeamScoreTotal ?? 0) > (m.homeTeamScoreTotal ?? 0);

      if (isWin) {
        totalPoints += 2; // 🏆 2 Points awarded per match victory
      }
    });

    // Write the compiled points value directly to the team ledger row
    await db.update(teams).set({ points: totalPoints }).where(eq(teams.id, teamId));
  }
}

// FIXED: Define explicit Promise-based interface structure for Next.js 15 compiler constraints
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// =========================================================================
// 2. MAIN CORE SERVER COMPONENT ROUTE
// =========================================================================
export default async function MatchScorecardPage({ params }: PageProps) {
  // A. Await the params container Promise before using variables
  const { id } = await params;
  const matchId = Number(id);

  const [match] = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: teams.name,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
    })
    .from(matches)
    .leftJoin(teams, eq(matches.homeTeamId, teams.id))
    .where(eq(matches.id, matchId));

  if (!match) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Match fixture not found.</div>;
  }

  const [awayTeam] = match.awayTeamId 
    ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, match.awayTeamId))
    : [null];

  const awayTeamName = awayTeam?.name || "Away Club";

  const homePlayers = match.homeTeamId
    ? await db.select().from(players).where(eq(players.teamId, match.homeTeamId)).orderBy(asc(players.name))
    : [];

  const awayPlayers = match.awayTeamId
    ? await db.select().from(players).where(eq(players.teamId, match.awayTeamId)).orderBy(asc(players.name))
    : [];

  const existingFrames = await db
    .select()
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  // =========================================================================
  // 3. INLINE SERVER ACTIONS FOR IN-MEMORY MUTATIONS
  // =========================================================================
  async function addFrameFrameRow() {
    "use server";
    const currentFrameCount = existingFrames.length;
    const nextGameType = (currentFrameCount + 1) % 3 === 0 ? "double" : "single";

    await db.insert(matchGames).values({
      matchId,
      gameOrder: currentFrameCount + 1,
      gameType: nextGameType,
      player1Id: null,
      player1PartnerId: null,
      player2Id: null,
      player2PartnerId: null,
      player1Score: 0,
      player2Score: 0,
    });

    revalidatePath(`/admin/matches/${matchId}/scorecard`);
  }

  async function saveFrameScores(formData: FormData) {
    "use server";
    const gameId = Number(formData.get("gameId"));
    const player1Id = formData.get("player1Id") ? Number(formData.get("player1Id")) : null;
    const player1PartnerId = formData.get("player1PartnerId") ? Number(formData.get("player1PartnerId")) : null;
    const player2Id = formData.get("player2Id") ? Number(formData.get("player2Id")) : null;
    const player2PartnerId = formData.get("player2PartnerId") ? Number(formData.get("player2PartnerId")) : null;
    const player1Score = Number(formData.get("player1Score") || 0);
    const player2Score = Number(formData.get("player2Score") || 0);

    await db
      .update(matchGames)
      .set({
        player1Id,
        player1PartnerId,
        player2Id,
        player2PartnerId,
        player1Score,
        player2Score,
      })
      .where(eq(matchGames.id, gameId));

    await syncMatchTotals(matchId);

    revalidatePath("/");
    revalidatePath("/standings"); 
    revalidatePath("/teams");
    revalidatePath("/players");
    revalidatePath(`/admin/matches/${matchId}/scorecard`);
  }

  async function changeGameTypeAction(formData: FormData) {
    "use server";
    const gameId = Number(formData.get("gameId"));
    const currentType = formData.get("currentGameType") as string;
    const targetType = currentType === "single" ? "double" : "single";

    await db
      .update(matchGames)
      .set({
        gameType: targetType,
        player1PartnerId: targetType === "single" ? null : undefined,
        player2PartnerId: targetType === "single" ? null : undefined,
      })
      .where(eq(matchGames.id, gameId));

    revalidatePath(`/admin/matches/${matchId}/scorecard`);
  }

  async function deleteFrameRow(formData: FormData) {
    "use server";
    const gameId = Number(formData.get("gameId"));
    
    await db.delete(matchGames).where(eq(matchGames.id, gameId));

    const remainingGames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .orderBy(asc(matchGames.gameOrder));

    for (let i = 0; i < remainingGames.length; i++) {
      await db
        .update(matchGames)
        .set({ gameOrder: i + 1 })
        .where(eq(matchGames.id, remainingGames[i].id));
    }

    await syncMatchTotals(matchId);

    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath(`/admin/matches/${matchId}/scorecard`);
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/admin/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
          <ArrowLeft className="w-4 h-4" /> Exit to Matches Index
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest tabular-nums">
          Fixture ID Block: #{matchId}
        </div>
      </header>

      {/* Score Dashboard Banner Visual Jumbotron */}
      <section className="bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-slate-900 relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full bg-indigo-600/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          <div className="md:col-span-3 text-center md:text-right space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">HOME SQUAD</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">{match.homeTeamName || "Home Club"}</h2>
          </div>
          
          <div className="md:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 min-w-[120px] mx-auto">
            <span className="text-3xl font-black tracking-tight tabular-nums text-indigo-400">
              {match.homeTeamScoreTotal ?? 0} - {match.awayTeamScoreTotal ?? 0}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mt-1">Frames Summary</span>
          </div>

          <div className="md:col-span-3 text-center md:text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">AWAY SQUAD</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">{awayTeamName}</h2>
          </div>
        </div>
      </section>

      {/* Frame Sheet Records Loop Ledger */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Frame Ledger Sheet</h3>
          </div>
          
          <form action={addFrameFrameRow}>
            <button className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-2.5 px-4 rounded-xl transition-all shadow-sm">
              <Plus className="w-4 h-4 stroke-[3]" /> Append Frame Row
            </button>
          </form>
        </div>

        {/* WIDESCREEN HORIZONTAL ROW LAYOUT MATRIX */}
        <div className="space-y-4">
          {existingFrames.map((frame) => {
            const isDouble = frame.gameType === "double";

            return (
              <form 
                key={frame.id}
                action={saveFrameScores}
                className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-slate-300 transition-colors grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative"
              >
                <input type="hidden" name="gameId" value={frame.id} />
                <input type="hidden" name="currentGameType" value={frame.gameType || "single"} />
                
                {/* 1. LEFT UTILS: Index & Variant Controller */}
                <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-4 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Frame</span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">F{frame.gameOrder}</span>
                  </div>
                  
                  <div className="flex-1 max-w-[110px]">
                    <button
                      formAction={changeGameTypeAction}
                      className={`w-full text-left px-2.5 py-2 rounded-xl border font-black text-[9px] uppercase tracking-wider flex items-center justify-between group transition-all ${
                        isDouble 
                          ? "bg-purple-50 text-purple-600 border-purple-200" 
                          : "bg-blue-50 text-blue-600 border-blue-200"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {isDouble ? <UsersIcon className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {frame.gameType}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. HOME COMPETITORS SLOTS */}
                <div className="md:col-span-3 space-y-1.5">
                  <select 
                    name="player1Id" 
                    defaultValue={frame.player1Id ? String(frame.player1Id) : ""}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Home Player...</option>
                    {homePlayers.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>

                  {isDouble && (
                    <select 
                      name="player1PartnerId" 
                      defaultValue={frame.player1PartnerId ? String(frame.player1PartnerId) : ""}
                      className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <option value="">Select Partner...</option>
                      {homePlayers.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                  )}
                </div>

                {/* 3. CENTRAL LIVE SCORE INPUTS BLOCK */}
                <div className="md:col-span-2 flex items-center justify-center gap-3 bg-slate-950 p-2.5 rounded-2xl max-w-[150px] mx-auto shadow-inner border border-slate-900">
                  <input 
                    type="number" 
                    name="player1Score" 
                    defaultValue={frame.player1Score ?? 0}
                    className="w-12 text-center font-black text-xl text-white bg-slate-900 border border-slate-800 p-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums focus:bg-indigo-600 focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-[10px] font-black text-slate-600 uppercase select-none">VS</span>
                  <input 
                    type="number" 
                    name="player2Score" 
                    defaultValue={frame.player2Score ?? 0}
                    className="w-12 text-center font-black text-xl text-white bg-slate-900 border border-slate-800 p-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums focus:bg-indigo-600 focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* 4. AWAY COMPETITORS SLOTS */}
                <div className="md:col-span-3 space-y-1.5">
                  <select 
                    name="player2Id" 
                    defaultValue={frame.player2Id ? String(frame.player2Id) : ""}
                    className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Away Player...</option>
                    {awayPlayers.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>

                  {isDouble && (
                    <select 
                      name="player2PartnerId" 
                      defaultValue={frame.player2PartnerId ? String(frame.player2PartnerId) : ""}
                      className="w-full p-3 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mt-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <option value="">Select Partner...</option>
                      {awayPlayers.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                  )}
                </div>

                {/* 5. RIGHT CONTROLS: Destructive / Save Operations */}
                <div className="md:col-span-2 flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto">
                  <button 
                    type="submit"
                    className="p-3 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all grow md:grow-0 text-center flex items-center justify-center gap-1 shadow-sm shadow-emerald-100"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>

                  <button 
                    formAction={deleteFrameRow}
                    className="p-3 bg-slate-100 text-slate-400 hover:bg-rose-600 hover:text-white border border-slate-200/40 hover:border-rose-600 rounded-xl transition-all flex items-center justify-center grow md:grow-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </form>
            );
          })}

          {existingFrames.length === 0 && (
            <div className="bg-white p-20 rounded-[2.5rem] border border-slate-200 text-center text-xs font-black text-slate-300 uppercase tracking-widest italic shadow-sm">
              No active match games appended to this frame sheet log yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}