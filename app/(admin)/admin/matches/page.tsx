import { db } from "@/src/db";
import { matches, teams, matchGames, players } from "@/src/db/schema";
import { eq, asc, desc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Calendar, Plus, Trophy, Shield, CheckCircle2, AlertCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    selectedMatch?: string;
  }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeMatchId = params.selectedMatch ? Number(params.selectedMatch) : null;

  // 1. Fetch all matches with home and away team details
  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      homeTeamName: teams.name,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamId: matches.awayTeamId,
      awayTeamName: teams.name,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
    })
    .from(matches)
    // Left join teams twice using aliases or direct schema conditions
    .leftJoin(teams, eq(matches.homeTeamId, teams.id))
    .orderBy(desc(matches.matchDate));

  // Resolve double join text duplication cleanly by cross-checking matching references
  const rawTeams = await db.select().from(teams);
  const getTeamName = (id: number | null) => rawTeams.find(t => t.id === id)?.name || "Unknown Squad";

  // 2. Fetch data context if a specific match scorecard is actively selected
  const activeMatch = allMatches.find((m) => m.id === activeMatchId);
  
  let availableHomePlayers: any[] = [];
  let availableAwayPlayers: any[] = [];
  let currentMatchGames: any[] = [];

  // ✅ FIXED: Add strict defensive check ensuring IDs are not null before querying player lists
  if (activeMatch && activeMatch.homeTeamId && activeMatch.awayTeamId) {
    availableHomePlayers = await db
      .select()
      .from(players)
      .where(eq(players.teamId, activeMatch.homeTeamId)); // Safe now: homeTeamId is strictly a number here

    availableAwayPlayers = await db
      .select()
      .from(players)
      .where(eq(players.teamId, activeMatch.awayTeamId)); // Safe now: awayTeamId is strictly a number here

    currentMatchGames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, activeMatch.id))
      .orderBy(asc(matchGames.gameOrder));
  }

  // =========================================================================
  // SERVER ACTION: APPEND A FRAME TO THE MATCH RECORD
  // =========================================================================
  async function addFrameAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    const gameType = formData.get("gameType") as "single" | "double";
    
    const p1Id = formData.get("player1Id") ? Number(formData.get("player1Id")) : null;
    const p1PartnerId = formData.get("player1PartnerId") ? Number(formData.get("player1PartnerId")) : null;
    const p2Id = formData.get("player2Id") ? Number(formData.get("player2Id")) : null;
    const p2PartnerId = formData.get("player2PartnerId") ? Number(formData.get("player2PartnerId")) : null;

    const p1Score = Number(formData.get("player1Score") || 0);
    const p2Score = Number(formData.get("player2Score") || 0);

    if (!matchId) return;

    // Get current frame count to determine order position
    const existing = await db.select().from(matchGames).where(eq(matchGames.matchId, matchId));
    const nextOrder = existing.length + 1;

    await db.insert(matchGames).values({
      matchId,
      gameOrder: nextOrder,
      gameType,
      player1Id: p1Id,
      player1PartnerId: p1PartnerId,
      player2Id: p2Id,
      player2PartnerId: p2PartnerId,
      player1Score: p1Score,
      player2Score: p2Score,
    });

    // Dynamically update total running score totals inside the parent match record
    let homeIncrement = p1Score > p2Score ? 1 : 0;
    let awayIncrement = p2Score > p1Score ? 1 : 0;

    const currentMatchRecord = await db.select().from(matches).where(eq(matches.id, matchId));
    if (currentMatchRecord[0]) {
      await db
        .update(matches)
        .set({
          homeTeamScoreTotal: (currentMatchRecord[0].homeTeamScoreTotal || 0) + homeIncrement,
          awayTeamScoreTotal: (currentMatchRecord[0].awayTeamScoreTotal || 0) + awayIncrement,
        })
        .where(eq(matches.id, matchId));
    }

    revalidatePath("/admin/matches");
    revalidatePath("/players");
  }

  // =========================================================================
  // SERVER ACTION: FINALIZE & LOCK THE COMPLETED MATCH
  // =========================================================================
  async function finalizeMatchAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    if (!matchId) return;

    const currentMatch = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!currentMatch[0]) return;

    // 🛡️ GUARD: Ensure home and away team IDs exist and are not null before proceeding
    if (!currentMatch[0].homeTeamId || !currentMatch[0].awayTeamId) {
      console.warn(`⚠️ Aborted finalization: Match ID ${matchId} contains a null team relation.`);
      return;
    }

    const homeScore = currentMatch[0].homeTeamScoreTotal || 0;
    const awayScore = currentMatch[0].awayTeamScoreTotal || 0;

    let homePointsAward = 0;
    let awayPointsAward = 0;

    if (homeScore > awayScore) homePointsAward = 3;
    else if (awayScore > homeScore) awayPointsAward = 3;
    else {
      homePointsAward = 1;
      awayPointsAward = 1;
    }

    // 1. Mark match fixture status as completed
    await db.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

    // 2. Hydrate team table point accumulations (Safe now, compiler knows they aren't null)
    const homeTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.id, currentMatch[0].homeTeamId));
      
    if (homeTeam[0]) {
      await db
        .update(teams)
        .set({ points: (homeTeam[0].points || 0) + homePointsAward })
        .where(eq(teams.id, homeTeam[0].id));
    }

    const awayTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.id, currentMatch[0].awayTeamId));
      
    if (awayTeam[0]) {
      await db
        .update(teams)
        .set({ points: (awayTeam[0].points || 0) + awayPointsAward })
        .where(eq(teams.id, awayTeam[0].id));
    }

    revalidatePath("/admin/matches");
    revalidatePath("/players");
    revalidatePath("/admin/dashboard");
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* TITLE CONTAINER HERO */}
      <header className="border-b border-slate-200/60 pb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Live Match Logistics</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Scorecard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Dispatch</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-0.5">Input raw frame results, track match validation steps, and update team standings instantly.</p>
      </header>

      {/* COMPONENT DIVISION GRID WRAPPER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT COLUMN: TIMELINE LEDGER CORES (Spans 5 columns) */}
        <div className="lg:col-span-5 space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block px-1">Scheduled Fixtures Ledger</span>
          
          {allMatches.map((m) => {
            const isSelected = m.id === activeMatchId;
            const isCompleted = m.status === "completed";
            const homeName = getTeamName(m.homeTeamId);
            const awayName = getTeamName(m.awayTeamId);

            return (
              <a
                key={m.id}
                href={`/admin/matches?selectedMatch=${m.id}`}
                className={`block p-4 rounded-2xl border transition-all ${
                  isSelected 
                    ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10" 
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    isCompleted 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-indigo-500/10 text-indigo-500"
                  }`}>
                    {m.status}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                    {m.matchDate ? new Date(m.matchDate).toLocaleDateString() : "TBD"}
                  </span>
                </div>

                <div className="flex justify-between items-center font-black text-xs uppercase tracking-tight">
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{homeName}</span>
                  </div>
                  <span className="text-sm tracking-normal font-mono px-2 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white rounded">
                    {m.homeTeamScoreTotal ?? 0} : {m.awayTeamScoreTotal ?? 0}
                  </span>
                  <div className="flex items-center gap-2 truncate justify-end text-right">
                    <span className="truncate">{awayName}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* RIGHT COMPONENT COLUMN: LIVE SCORECARD MATRICES SHEET (Spans 7 columns) */}
        <div className="lg:col-span-7">
          {activeMatch ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
              
              {/* Scorecard Header Banner */}
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    {getTeamName(activeMatch.homeTeamId)} <span className="text-slate-300 font-medium font-mono px-1">vs</span> {getTeamName(activeMatch.awayTeamId)}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live Scorecard Verification Blueprint</p>
                </div>
                
                {activeMatch.status !== "completed" && (
                  <form action={finalizeMatchAction}>
                    <input type="hidden" name="matchId" value={activeMatch.id} />
                    <button type="submit" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest py-2 px-4 rounded-xl transition-all shadow-md shadow-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lock Final Scores
                    </button>
                  </form>
                )}
              </div>

              {/* Rendered List of Played Frames */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block px-1">Played Frame History</span>
                {currentMatchGames.map((game) => (
                  <div key={game.id} className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="text-[10px] font-black text-slate-400 font-mono">F{game.gameOrder}</span>
                    <div className="flex-1 px-4 grid grid-cols-3 items-center text-center">
                      <span className="text-left truncate text-slate-900 font-black">{game.player1Id ? "Assigned Player" : "Vacant Slot"}</span>
                      <span className="font-mono bg-white border border-slate-200 rounded px-2 py-0.5 mx-auto font-black text-slate-950">
                        {game.player1Score} — {game.player2Score}
                      </span>
                      <span className="text-right truncate text-slate-900 font-black">{game.player2Id ? "Assigned Player" : "Vacant Slot"}</span>
                    </div>
                  </div>
                ))}
                
                {currentMatchGames.length === 0 && (
                  <div className="text-center py-8 text-slate-300 italic text-xs font-bold uppercase tracking-wider">No match frames logged for this fixture card yet.</div>
                )}
              </div>

              {/* Add Frame Entry Form (Hidden if match is completed) */}
              {activeMatch.status !== "completed" ? (
                <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Append Scoreboard Frame</h3>
                  </div>

                  <form action={addFrameAction} className="space-y-4">
                    <input type="hidden" name="matchId" value={activeMatch.id} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Frame Match Format</label>
                        <select name="gameType" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none">
                          <option value="single">Singles Frame Match</option>
                          <option value="double">Doubles Frame Match</option>
                        </select>
                      </div>
                    </div>

                    {/* Score inputs block */}
                    <div className="grid grid-cols-7 gap-2 items-center text-center">
                      <div className="col-span-3">
                        <select name="player1Id" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                          <option value="">Select Home Competitor...</option>
                          {availableHomePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <input type="number" name="player1Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-center font-mono text-sm text-slate-950 outline-none" />
                      </div>
                      <div className="col-span-1 font-black text-slate-300 font-mono text-xs">VS</div>
                      <div className="col-span-1">
                        <input type="number" name="player2Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-center font-mono text-sm text-slate-950 outline-none" />
                      </div>
                      <div className="col-span-3">
                        <select name="player2Id" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none truncate">
                          <option value="">Select Away Competitor...</option>
                          {availableAwayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition-all shadow-md shadow-indigo-100">
                      Submit Frame Result
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-bold uppercase tracking-tight">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  This match has been locked and authorized. Final league standings points have been distributed.
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center justify-center min-h-[40vh] border-dashed">
              <AlertCircle className="w-6 h-6 text-slate-300 mb-2 stroke-[1.5]" />
              Select a scheduled fixture from the timeline ledger panel to open its interactive verification scorecard.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}